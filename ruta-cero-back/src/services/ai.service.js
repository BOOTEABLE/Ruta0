import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { pool } from '../repositories/db.js';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Cuántos turnos previos mandamos a Gemini. Sube/baja esto según cuánto
// contexto necesite tu bot vs. cuántos tokens quieres pagar por request.
const MAX_TURNOS_HISTORIAL = 6;

export const procesarMensaje = async (mensaje, lat, lng, historial = []) => {
    try {
        let lugares = [];

        // 1. Buscamos a un radio de 2km (2000 metros) usando PostGIS
        if (lat && lng) {
            console.log(`📍 Buscando a 2km de: Lat ${lat}, Lng ${lng}...`);
            const query = `
                SELECT * FROM lugares 
                WHERE ST_DWithin(
                    ubicacion::geography, 
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
                    2000 
                ) LIMIT 30; -- Limitamos a 30 para no saturar a la IA
            `;
            const resultadoDB = await pool.query(query, [lng, lat]);
            lugares = resultadoDB.rows;
        } else {
            console.log("⚠️ No hay GPS. Buscando lugares aleatorios...");
            const resultadoDB = await pool.query('SELECT * FROM lugares LIMIT 30;');
            lugares = resultadoDB.rows;
        }

        // 2. Formateamos los datos
        let lugaresTexto = "Actualmente no hay lugares registrados cerca de esta ubicación.";
        if (lugares.length > 0) {
            lugaresTexto = lugares.map(
                lugar => `- **${lugar.nombre}** (${lugar.categoria}): ${lugar.descripcion}`
            ).join('\n');
        }

        // 3. MEMORIA DE CONVERSACIÓN: convertimos el historial que manda el
        // frontend ({emisor, texto}) al formato que espera el SDK de Gemini
        // ({role, parts}), y lo recortamos para no pagar tokens de más.
        const historialRecortado = historial.slice(-MAX_TURNOS_HISTORIAL);
        let historialGemini = historialRecortado.map(turno => ({
            role: turno.emisor === 'usuario' ? 'user' : 'model',
            parts: [{ text: turno.texto }]
        }));

        // 👇 FIX: el SDK de Gemini exige que el historial empiece en role 'user'.
        // Si el primer turno es del bot (ej. el saludo inicial de bienvenida
        // que pone el frontend sin haber pasado por Gemini), lo descartamos
        // junto con todo lo anterior al primer mensaje real del usuario.
        const primerIndiceUsuario = historialGemini.findIndex(t => t.role === 'user');
        historialGemini = primerIndiceUsuario === -1 ? [] : historialGemini.slice(primerIndiceUsuario);

        // 4. CAPA DE INTELIGENCIA: Gemini Flash Latest + Búsqueda en Internet
        const chat = ai.chats.create({
            model: "gemini-flash-latest",
            config: {
                systemInstruction: `
Eres un asistente turístico experto de Ruta0, para la ciudad de Quito.

REGLAS ESTRICTAS:
1. Recomienda ÚNICAMENTE los lugares de la base de datos local que se te inyecte en cada mensaje. No inventes lugares.
2. Si el usuario pregunta si están abiertos, o quieres dar un buen servicio, USA TU HERRAMIENTA DE GOOGLE SEARCH para buscar los horarios reales de los lugares recomendados en internet.
3. Si te preguntan por el clima actual, busca el clima de Quito en internet.
4. Sé conciso y honesto. Si no encuentras el horario en internet, dile al usuario que no pudiste confirmarlo.
5. Usa el historial de la conversación para entender referencias como "el segundo", "uno más barato" o "ese lugar", en vez de pedirle al usuario que repita todo.
                `,
                tools: [{ googleSearch: {} }]
            },
            history: historialGemini
        });

        // 5. EL RELOJ: Para que sepa si un lugar está abierto AHORA
        const fechaActual = new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" });

        // 6. PROMPT DEL TURNO ACTUAL: solo lo que cambia mensaje a mensaje
        // (la fecha y los lugares cercanos, que dependen del momento y del GPS).
        const promptTurno = `
Fecha y hora actual: ${fechaActual}.

BASE DE DATOS LOCAL (Lugares a menos de 2km):
${lugaresTexto}

Mensaje del usuario: "${mensaje}"
        `;

        console.log(`🤖 Consultando a Gemini Flash Latest con Grounding (historial: ${historialGemini.length} turnos)...`);
        const response = await chat.sendMessage({ message: promptTurno });
        return { 
            respuesta: response.text,
            lugaresFisicos: lugares 
        };

    } catch (error) {
        console.error("❌ Error en el servicio de IA:", error);
        throw new Error("No pudimos contactar a la IA o a la Base de Datos");
    }
};