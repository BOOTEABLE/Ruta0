import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { pool } from '../repositories/db.js';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 👇 NUEVO: usamos el alias "-latest" en vez de fijar una versión concreta
// (ej. "gemini-2.5-flash"). Google mueve el alias al modelo Flash vigente
// automáticamente, así que cuando descontinúen la versión actual (como
// pasó recién con 2.5) tu app sigue funcionando sin que tengas que salir
// a cambiar código. Si tu materia pide que documentes qué versión exacta
// usaste (para el benchmarking), imprime `response.modelVersion` una vez
// y anótalo en el informe.
const MODELO_GEMINI = "gemini-flash-lite-latest";

// Cuántos turnos previos mandamos a Gemini. Sube/baja esto según cuánto
// contexto necesite tu bot vs. cuántos tokens quieres pagar por request.
const MAX_TURNOS_HISTORIAL = 6;

const REGLAS_SISTEMA = `
Eres un asistente turístico experto de Ruta0, para la ciudad de Quito.

REGLAS ESTRICTAS:
1. Tu PRIMERA OPCIÓN siempre debe ser recomendar los lugares de la BASE DE DATOS LOCAL que se te inyecta.
2. Si el usuario pide algo que NO está en la base de datos local (o si la base viene vacía), USA TU HERRAMIENTA DE GOOGLE SEARCH para buscar recomendaciones reales y actualizadas en internet.
3. Si recomiendas un lugar sacado de internet, aclárale sutilmente al usuario que es una recomendación externa y que no aparecerá en el mapa.
4. Usa tu herramienta de búsqueda también para confirmar horarios o el clima de la ciudad.
5. Usa el historial de la conversación para entender referencias como "el segundo", "uno más barato" o "ese lugar", en vez de pedirle al usuario que repita todo.

6. 🛡️ RESTRICCIÓN DE TEMA (GUARDRAIL): Eres ESTRICTAMENTE un guía turístico y gastronómico de Quito. Si el usuario te pregunta sobre temas que NO tienen relación con turismo, restaurantes, cultura, clima local o navegación (por ejemplo: matemáticas, política, programación, tareas escolares, etc.):
   - RECHAZA la petición de forma educada pero firme.
   - BAKE OUT: NO utilices la herramienta de Google Search para buscar información sobre ese tema ajeno.
   - Redirige la conversación a tu propósito. 
   - Ejemplo de respuesta: "Lo siento, mi especialidad es ayudarte a descubrir los mejores lugares y restaurantes en Quito, por lo que no puedo explicarte el Teorema de Pitágoras. ¿Te gustaría que busque una buena cafetería cerca de ti?"

7. Al final de TU RESPUESTA, SIEMPRE agrega una línea nueva exactamente así:
LUGARES_RECOMENDADOS: NombreExacto1, NombreExacto2
   🚨 REGLA CRÍTICA PARA ESTA LÍNEA: Usa ÚNICAMENTE los nombres de los lugares que recomendaste y que SÍ ESTÁN en la BASE DE DATOS LOCAL. NO incluyas aquí los lugares que encontraste en internet. Si todos los lugares que recomendaste vinieron de internet y ninguno de la base local, escribe estrictamente:
   LUGARES_RECOMENDADOS: (ninguno)
   Esta línea es oculta para el sistema de pines del mapa, el usuario no debe saber que existe.
`;

// 👇 NUEVO: separa el texto que sí ve el usuario de la línea
// "LUGARES_RECOMENDADOS: ..." que agregamos por instrucción del sistema.
// Con eso filtramos qué pines mostrar en el mapa, para que coincidan
// exactamente con lo que el chat dice — ya no mandamos "los 30 más
// cercanos" de regalo si Gemini solo recomendó 3.
const separarRespuestaYRecomendados = (textoCompleto, lugaresDisponibles) => {
    const match = textoCompleto.match(/LUGARES_RECOMENDADOS:\s*(.+)/i);

    if (!match) {
        // El modelo no siguió el formato esperado — no rompemos la app,
        // devolvemos todo lo recuperado como antes (comportamiento seguro).
        return { respuesta: textoCompleto.trim(), lugaresFisicos: lugaresDisponibles };
    }

    const respuestaLimpia = textoCompleto.slice(0, match.index).trim();
    const nombresRecomendados = match[1]
        .split(',')
        .map(n => n.trim().toLowerCase())
        .filter(n => n && n !== '(ninguno)');

    if (nombresRecomendados.length === 0) {
        return { respuesta: respuestaLimpia, lugaresFisicos: [] };
    }

    const lugaresFiltrados = lugaresDisponibles.filter(l =>
        nombresRecomendados.includes(l.nombre.trim().toLowerCase())
    );

    return { respuesta: respuestaLimpia, lugaresFisicos: lugaresFiltrados };
};

// 👇 NUEVO (Opción B / RAG): la vía SQL ya no responde por su cuenta — solo
// recupera datos. Si el router detectó una categoría explícita en el
// mensaje (ej. "cafeterías"), filtramos la búsqueda a esa categoría para
// una recuperación más precisa y un prompt más corto. Si no hay categoría
// clara, hacemos la búsqueda general de siempre.
export const procesarMensaje = async (mensaje, lat, lng, historial = [], categoria = null) => {
    try {
        let lugares = [];
        const condicionCategoria = categoria ? 'AND categoria = $3' : '';
        const parametrosCategoria = categoria ? [categoria] : [];

        // 1. Buscamos a un radio de 2km (2000 metros) usando PostGIS
        if (lat && lng) {
            console.log(`📍 Buscando a 2km de: Lat ${lat}, Lng ${lng}... ${categoria ? `(categoría: ${categoria})` : '(todas las categorías)'}`);
            const query = `
                SELECT * FROM lugares 
                WHERE ST_DWithin(
                    ubicacion::geography, 
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
                    2000 
                ) ${condicionCategoria}
                LIMIT 30; -- Limitamos a 30 para no saturar a la IA
            `;
            const resultadoDB = await pool.query(query, [lng, lat, ...parametrosCategoria]);
            lugares = resultadoDB.rows;
        } else {
            console.log("⚠️ No hay GPS. Buscando lugares aleatorios...");
            const query = categoria
                ? 'SELECT * FROM lugares WHERE categoria = $1 LIMIT 30;'
                : 'SELECT * FROM lugares LIMIT 30;';
            const resultadoDB = await pool.query(query, parametrosCategoria);
            lugares = resultadoDB.rows;
        }

        // 2. Formateamos los datos
        let lugaresTexto = "Actualmente no hay lugares registrados cerca de esta ubicación.";
        if (lugares.length > 0) {
            lugaresTexto = lugares.map(
                lugar => `- **${lugar.nombre}** (${lugar.categoria}): ${lugar.descripcion}`
            ).join('\n');
        }

        // 3. EL RELOJ: Para que sepa si un lugar está abierto AHORA
        const fechaActual = new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" });

        // 4. MEMORIA DE CONVERSACIÓN: convertimos el historial que manda el
        // frontend ({emisor, texto}) al formato que espera el SDK de Gemini
        // ({role, parts}), y lo recortamos para no pagar tokens de más.
        const historialRecortado = historial.slice(-MAX_TURNOS_HISTORIAL);
        let historialGemini = historialRecortado.map(turno => ({
            role: turno.emisor === 'usuario' ? 'user' : 'model',
            parts: [{ text: turno.texto }]
        }));

        // El SDK exige que el historial empiece en role 'user'. Si el primer
        // turno es del bot (ej. el saludo inicial que pone el frontend sin
        // haber pasado por Gemini), lo descartamos junto con todo lo anterior
        // al primer mensaje real del usuario.
        const primerIndiceUsuario = historialGemini.findIndex(t => t.role === 'user');
        historialGemini = primerIndiceUsuario === -1 ? [] : historialGemini.slice(primerIndiceUsuario);

        // 👇 NUEVO SDK: ai.chats.create() en vez de model.startChat().
        // Las reglas fijas y las tools (Google Search) van dentro de `config`.
        const chat = ai.chats.create({
            model: MODELO_GEMINI,
            history: historialGemini,
            config: {
                systemInstruction: REGLAS_SISTEMA,
                tools: [{ googleSearch: {} }], // ¡Encendemos el internet!
            }
        });

        // 5. PROMPT DEL TURNO ACTUAL: solo lo que cambia mensaje a mensaje
        // (la fecha y los lugares cercanos, que dependen del momento y del GPS).
        const promptTurno = `
Fecha y hora actual: ${fechaActual}.

BASE DE DATOS LOCAL (Lugares a menos de 2km):
${lugaresTexto}

Mensaje del usuario: "${mensaje}"
        `;

        console.log(`🤖 Consultando a Gemini (${MODELO_GEMINI}) con Grounding (historial: ${historialGemini.length} turnos)...`);
        // 👇 NUEVO SDK: sendMessage recibe un objeto { message }, y la
        // respuesta trae el texto directo en `.text` (no `.response.text()`).
        const result = await chat.sendMessage({ message: promptTurno });

        // 👇 NUEVO: separamos la respuesta visible de la lista de
        // recomendados, y filtramos los pines del mapa con eso.
        return separarRespuestaYRecomendados(result.text, lugares);

    } catch (error) {
        console.error("❌ Error en el servicio de IA:", error);
        throw new Error("No pudimos contactar a la IA o a la Base de Datos");
    }
};