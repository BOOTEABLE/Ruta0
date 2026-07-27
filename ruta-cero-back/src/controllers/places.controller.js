import { buscarLugaresOverpass, getCategoriasDisponibles } from '../services/overpassPlaces.service.js';
import { getCachedPlaces, setCachedPlaces } from '../repositories/overpassCache.repository.js';

const CATEGORIAS_DISPONIBLES = getCategoriasDisponibles();

function buildCacheKey(categoria, lat, lng, radius) {
    return `overpass:${categoria}:${lat.toFixed(4)},${lng.toFixed(4)}:r${radius}`;
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

export const getCategoriasOverpass = async (req, res) => {
    res.json({ categorias: CATEGORIAS_DISPONIBLES });
};