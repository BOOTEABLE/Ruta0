import { procesarMensaje } from '../services/ai.service.js';

// 👇 Opción B (RAG real): estas palabras clave ya NO deciden si la
// respuesta "corta" en SQL — solo le dan una pista a la búsqueda de la
// base de datos sobre en qué categoría concentrarse. La redacción de la
// respuesta SIEMPRE la hace Gemini, usando lo recuperado como contexto.
const PALABRAS_POR_CATEGORIA = {
    'Cafeterías': [/\bcafe\w*\b/],
    'Gastronomía': [/\brestaurantes?\b/, /\bcomida\b/, /\balmorzar\b/, /\bcenar\b/],
    'Cultura': [/\bmuseos?\b/],
    'Parques': [/\bparques?\b/],
    'Miradores': [/\bmiradores?\b/],
    'Entretenimiento': [/\bcines?\b/, /\bpel[ií]cula\b/],
    'Centros Comerciales': [/\bcentro[s]? comercial(es)?\b/, /\bmall\b/, /\bcc\b/],
    'Vida Nocturna': [/\bbares?\b/, /\bdiscotecas?\b/, /\bfiesta\b/, /\btrago\b/],
};

const detectarCategoria = (texto) => {
    for (const [categoria, patrones] of Object.entries(PALABRAS_POR_CATEGORIA)) {
        if (patrones.some(regex => regex.test(texto))) return categoria;
    }
    return null; // null = búsqueda general, sin filtrar por categoría
};

// ⚙️ EL ENRUTADOR (Controlador principal)
export const enviarMensajeChat = async (req, res) => {
    try {
        const { mensaje, lat, lng, historial } = req.body;

        const categoriaDetectada = detectarCategoria(mensaje.toLowerCase());
        console.log(`🧭 Categoría para la búsqueda: ${categoriaDetectada || '(ninguna, búsqueda general)'}`);

        const respuestaIA = await procesarMensaje(mensaje, lat, lng, historial, categoriaDetectada);
        return res.json(respuestaIA);

    } catch (error) {
        console.error("❌ Error en el chat:", error);
        res.status(500).json({ error: "Upps, no pude conectar con el servidor." });
    }
};