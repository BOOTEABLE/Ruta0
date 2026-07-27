import { buscarLugaresOverpass, getCategoriasDisponibles, buscarLugaresConFallback } from '../services/overpassPlaces.service.js';
import { getCachedPlaces, setCachedPlaces } from '../repositories/overpassCache.repository.js';

const CATEGORIAS_DISPONIBLES = getCategoriasDisponibles();

function buildCacheKey(categoria, lat, lng, radius) {
    return `overpass:${categoria}:${lat.toFixed(4)},${lng.toFixed(4)}:r${radius}`;
}

function intercalarLugares(resultadosPorCategoria, maxTotal = 15) {
    // resultadosPorCategoria: { categoria: [], otraCategoria: [] }
    const categorias = Object.keys(resultadosPorCategoria);
    if (categorias.length === 0) return [];
    
    const resultado = [];
    const indices = {};
    categorias.forEach(cat => indices[cat] = 0);
    
    // Round-robin: tomar uno de cada categoría por vuelta
    let agregados = 0;
    let vuelta = 0;
    
    while (agregados < maxTotal) {
        let algunoAgregado = false;
        
        for (const cat of categorias) {
            if (agregados >= maxTotal) break;
            
            const lista = resultadosPorCategoria[cat];
            const idx = indices[cat];
            
            if (idx < lista.length) {
                resultado.push({
                    ...lista[idx],
                    categoriaOrigen: cat // marcar de qué categoría vino
                });
                indices[cat]++;
                agregados++;
                algunoAgregado = true;
            }
        }
        
        if (!algunoAgregado) break; // todas las listas agotadas
        vuelta++;
    }
    
    return resultado;
}

export const getLugaresOverpass = async (req, res) => {
    try {
        const { categoria, lat, lng, radio } = req.query;

        if (!categoria || !CATEGORIAS_DISPONIBLES.includes(categoria)) {
            return res.status(400).json({ 
                error: 'Categoría requerida', 
                categoriasValidas: CATEGORIAS_DISPONIBLES 
            });
        }

        const latitude = lat ? parseFloat(lat) : -0.2435;
        const longitude = lng ? parseFloat(lng) : -78.5416;
        const radius = radio ? parseInt(radio) : 5000;

        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ error: 'Coordenadas inválidas' });
        }

        const cacheKey = buildCacheKey(categoria, latitude, longitude, radius);

        const cached = await getCachedPlaces(cacheKey);
        if (cached) {
            console.log(`💾 Cache HIT para ${cacheKey}`);
            return res.json({ 
                lugares: cached, 
                fuente: 'cache',
                categoria,
                total: cached.length 
            });
        }

        console.log(`🌐 Cache MISS - consultando Overpass para ${categoria}`);
        const lugares = await buscarLugaresOverpass(categoria, latitude, longitude, radius);

        await setCachedPlaces(cacheKey, lugares);

        res.json({ 
            lugares, 
            fuente: 'overpass',
            categoria,
            total: lugares.length 
        });

    } catch (error) {
        console.error('❌ Error en getLugaresOverpass:', error.message);
        res.status(500).json({ error: 'Error obteniendo lugares de OpenStreetMap' });
    }
};

// Nuevo endpoint para múltiples categorías con intercalado
export const getLugaresMultiples = async (req, res) => {
    try {
        const { categorias, lat, lng, radio } = req.query;

        // Parsear categorías (vienen como string separado por comas)
        const cats = categorias ? categorias.split(',').map(c => c.trim()) : [];
        
        if (cats.length === 0 || !cats.every(c => CATEGORIAS_DISPONIBLES.includes(c))) {
            return res.status(400).json({ 
                error: 'Categorías requeridas', 
                categoriasValidas: CATEGORIAS_DISPONIBLES 
            });
        }

        const latitude = lat ? parseFloat(lat) : -0.2435;
        const longitude = lng ? parseFloat(lng) : -78.5416;
        const radius = radio ? parseInt(radio) : 5000;

        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ error: 'Coordenadas inválidas' });
        }

        console.log(`🎯 Consulta multi-categoría: ${cats.join(', ')}`);

        // Consultar cada categoría en paralelo
        const promesas = cats.map(async (cat) => {
            const cacheKey = buildCacheKey(cat, latitude, longitude, radius);
            
            // Primero intentar caché
            const cached = await getCachedPlaces(cacheKey);
            if (cached) {
                console.log(`💾 Cache HIT para ${cat}`);
                return { categoria: cat, lugares: cached };
            }
            
            // Si no hay caché, consultar Overpass con fallback
            console.log(`🌐 Consultando Overpass para ${cat}`);
            const resultado = await buscarLugaresConFallback(cat, latitude, longitude, radius, getCachedPlaces, setCachedPlaces);
            
            return { 
                categoria: cat, 
                lugares: resultado.lugares,
                fuente: resultado.fuente
            };
        });

        const resultados = await Promise.all(promesas);
        
        // Organizar por categoría
        const resultadosPorCategoria = {};
        resultados.forEach(r => {
            resultadosPorCategoria[r.categoria] = r.lugares;
        });

        // Intercalar resultados
        const lugaresIntercalados = intercalarLugares(resultadosPorCategoria, 15);

        res.json({ 
            lugares: lugaresIntercalados,
            categorias: cats,
            total: lugaresIntercalados.length,
            fuentes: resultados.reduce((acc, r) => { acc[r.categoria] = r.fuente; return acc; }, {})
        });

    } catch (error) {
        console.error('❌ Error en getLugaresMultiples:', error.message);
        res.status(500).json({ error: 'Error obteniendo lugares multi-categoría' });
    }
};

export const getCategoriasOverpass = async (req, res) => {
    res.json({ categorias: CATEGORIAS_DISPONIBLES });
};