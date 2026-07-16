import { pool } from './db.js';

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// 1. EXTRACT: Definimos la consulta Overpass (Quito)
const queryOSM = `
[out:json][timeout:90];
(
  nwr["amenity"="cafe"](-0.35,-78.58,-0.08,-78.43);
  nwr["amenity"="restaurant"](-0.35,-78.58,-0.08,-78.43);
  nwr["tourism"="museum"](-0.35,-78.58,-0.08,-78.43);
  nwr["tourism"="viewpoint"](-0.35,-78.58,-0.08,-78.43);
  nwr["leisure"="park"](-0.35,-78.58,-0.08,-78.43);
  nwr["amenity"="cinema"](-0.35,-78.58,-0.08,-78.43);
  nwr["shop"="mall"](-0.35,-78.58,-0.08,-78.43);
  nwr["amenity"="bar"](-0.35,-78.58,-0.08,-78.43);
  nwr["amenity"="nightclub"](-0.35,-78.58,-0.08,-78.43);
);
out center;
`;

// 👇 NUEVO: OpenStreetMap es colaborativo — cualquiera edita las etiquetas,
// y en zonas menos mapeadas es común encontrar lugares mal etiquetados
// (ej. un restaurante marcado como amenity=cafe). Esta lista de palabras
// "delatoras" en el NOMBRE nos permite detectar esas contradicciones y
// corregir la categoría en vez de confiar ciegamente en el tag de OSM.
const PALABRAS_POR_CATEGORIA = {
    'Gastronomía': ['restaurante', 'restaurant', 'chifa', 'pizza', 'pizzería', 'asadero', 'parrillada', 'marisquería', 'comedor', 'grill', 'burger', 'pollos', 'hornado', 'broaster'],
    'Cafeterías': ['café', 'cafe', 'cafetería', 'coffee'],
};

const corregirCategoriaPorNombre = (nombre, categoriaDeOSM) => {
    const nombreLower = nombre.toLowerCase();
    for (const [categoriaSugerida, palabras] of Object.entries(PALABRAS_POR_CATEGORIA)) {
        if (categoriaSugerida === categoriaDeOSM) continue; // ya coincide, nada que corregir
        if (palabras.some(p => nombreLower.includes(p))) {
            return { categoria: categoriaSugerida, corregido: true };
        }
    }
    return { categoria: categoriaDeOSM, corregido: false };
};

// 👇 NUEVO: Puntaje de calidad documentado en harness.md pero que nunca se
// había implementado. Nombre (+30), Categoría (+20), Dirección (+15),
// Horario (+10), Teléfono (+10), Sitio Web (+10), Descripción/Imagen (+5).
// Restamos 25 si tuvimos que corregir la categoría por contradicción de
// nombre — es una señal de que el resto de los tags de OSM también podrían
// no ser confiables para ese registro.
const calcularConfianza = (tags, categoria, corregido = false) => {
    let puntaje = 0;
    if (tags.name) puntaje += 30;
    if (categoria !== 'Otros') puntaje += 20;
    if (tags['addr:street'] || tags['addr:full']) puntaje += 15;
    if (tags.opening_hours) puntaje += 10;
    if (tags.phone || tags['contact:phone']) puntaje += 10;
    if (tags.website || tags['contact:website']) puntaje += 10;
    if (tags.description || tags.image) puntaje += 5;
    if (corregido) puntaje -= 25;
    return puntaje;
};

export const ejecutarETL = async ({ cerrarConexionAlFinal = true } = {}) => {
    try {
        console.log("⏳ [ETL] 1. Extrayendo datos desde OpenStreetMap (Overpass API)...");
        
        const respuesta = await fetch(OVERPASS_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Ruta0-App-Quito/1.0"
            },
            body: "data=" + encodeURIComponent(queryOSM)
        });

        if (!respuesta.ok) {
            throw new Error(`Error en Overpass API: ${respuesta.statusText}`);
        }

        const datos = await respuesta.json();
        const elementos = datos.elements || [];
        console.log(`📥 [ETL] Se encontraron ${elementos.length} lugares en Quito.`);

        console.log("⏳ [ETL] 2. Limpiando y transformando datos...");
        console.log("⏳ [ETL] 3. Cargando datos en PostgreSQL con PostGIS...");

        let insertados = 0;
        let descartados = 0;

        for (const elemento of elementos) {
            if (!elemento.tags || !elemento.tags.name) continue;

            const nombre = elemento.tags.name;
            
            let categoria = "Otros";
            if (elemento.tags.amenity === 'cafe') categoria = 'Cafeterías';
            else if (elemento.tags.amenity === 'restaurant') categoria = 'Gastronomía';
            else if (elemento.tags.tourism === 'museum') categoria = 'Cultura';
            else if (elemento.tags.tourism === 'viewpoint') categoria = 'Miradores';
            else if (elemento.tags.leisure === 'park') categoria = 'Parques';
            else if (elemento.tags.amenity === 'cinema') categoria = 'Entretenimiento';
            else if (elemento.tags.shop === 'mall') categoria = 'Centros Comerciales';
            else if (elemento.tags.amenity === 'bar' || elemento.tags.amenity === 'nightclub') categoria = 'Vida Nocturna';

            // 👇 NUEVO: corregimos contradicciones entre el tag de OSM y el
            // nombre real del lugar (ej. "Chifa Galaxia" venía con
            // amenity=cafe, un mal etiquetado de OSM). Si corregimos, se lo
            // avisamos al equipo por consola para que lo puedan auditar.
            const { categoria: categoriaFinal, corregido } = corregirCategoriaPorNombre(nombre, categoria);
            if (corregido) {
                console.warn(`⚠️  [ETL] "${nombre}" venía como "${categoria}" en OSM, se corrigió a "${categoriaFinal}" por su nombre.`);
            }
            categoria = categoriaFinal;

            // 👇 NUEVO: aplicamos el filtro de calidad que documenta harness.md
            // y que antes no existía en el código: descartamos "lugares fantasma".
            const confianza = calcularConfianza(elemento.tags, categoria, corregido);
            if (confianza < 50) {
                descartados++;
                continue;
            }

            const horario = elemento.tags.opening_hours || 'Horario no disponible';

            const lat = elemento.lat || (elemento.center ? elemento.center.lat : null);
            const lng = elemento.lon || (elemento.center ? elemento.center.lon : null);

            if (!lat || !lng) continue;

            const precio = elemento.tags.price_level === '1' ? '$' : elemento.tags.price_level === '3' ? '$$$' : '$$';
            const descripcion = elemento.tags.description || `Un fantástico lugar de categoría ${categoria} ubicado en Quito.`;

            // 👇 NUEVO: agregamos 'confianza' y 'actualizado_en'. Además cambiamos
            // ON CONFLICT DO NOTHING por un UPDATE, para que al re-correr el ETL
            // los lugares que ya existen se refresquen (horario, descripción,
            // confianza) en vez de quedarse congelados con la primera carga.
            // Para esto necesitas una restricción UNIQUE en 'nombre' (ver nota abajo).
            const queryInsert = `
                INSERT INTO lugares (nombre, categoria, precio, descripcion, latitud, longitud, ubicacion, horario, confianza, actualizado_en)
                VALUES (
                    $1, 
                    $2, 
                    $3, 
                    $4, 
                    $5::numeric, 
                    $6::numeric, 
                    ST_SetSRID(ST_MakePoint($6::float, $5::float), 4326),
                    $7,
                    $8,
                    now()
                )
                ON CONFLICT (nombre) DO UPDATE SET
                    categoria = EXCLUDED.categoria,
                    precio = EXCLUDED.precio,
                    descripcion = EXCLUDED.descripcion,
                    horario = EXCLUDED.horario,
                    confianza = EXCLUDED.confianza,
                    actualizado_en = now();
            `;

            await pool.query(queryInsert, [nombre, categoria, precio, descripcion, lat, lng, horario, confianza]);
            insertados++;
        }

        console.log(`✅ [ETL] ¡Proceso completado! Se cargaron/actualizaron ${insertados} lugares. Se descartaron ${descartados} por baja confianza (<50 pts).`);

    } catch (error) {
        console.error("❌ [ETL] Error durante el proceso:", error.message);
    } finally {
        // 👇 Solo cerramos el pool si esto corrió como script suelto
        // (`node etl.js`). Si lo llama el cron dentro del servidor, el pool
        // debe seguir vivo para que el resto de la app siga usando la BD.
        if (cerrarConexionAlFinal) pool.end();
    }
};

// Si el archivo se ejecuta directamente (`node src/repositories/etl.js`),
// corre el ETL una vez y cierra la conexión al terminar, como antes.
if (import.meta.url === `file://${process.argv[1]}`) {
    ejecutarETL();
}