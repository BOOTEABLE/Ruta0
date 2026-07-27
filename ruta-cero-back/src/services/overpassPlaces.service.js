import fetch from 'node-fetch';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const QUITO_CENTER = { lat: -0.2435, lng: -78.5416 };
const DEFAULT_RADIUS = 5000;

// Configuración de reintentos
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1s, 2s, 4s
const REQUEST_TIMEOUT = 15000; // 15 segundos

const OSM_TAGS_BY_CATEGORY = {
    'Cafetería': ['amenity=cafe'],
    'Cafeterias': ['amenity=cafe'],
    'Gastronomía': ['amenity=restaurant'],
    'Restaurante': ['amenity=restaurant'],
    'Restaurantes': ['amenity=restaurant'],
    'Parques': ['leisure=park'],
    'Parque': ['leisure=park'],
    'Cultura': ['tourism=museum'],
    'Museo': ['tourism=museum'],
    'Museos': ['tourism=museum'],
    'Iglesia': ['amenity=place_of_worship', 'religion=christian'],
    'Iglesias': ['amenity=place_of_worship', 'religion=christian'],
    'Mirador': ['tourism=viewpoint'],
    'Miradores': ['tourism=viewpoint'],
    'Entretenimiento': ['tourism=attraction', 'leisure=park'],
    'Centros Comerciales': ['shop=mall'],
    'Centro Comercial': ['shop=mall'],
    'Centros Comercial': ['shop=mall'],
    'Vida Nocturna': ['amenity=bar', 'amenity=nightclub', 'amenity=pub'],
    'Bar': ['amenity=bar', 'amenity=pub'],
    'Bares': ['amenity=bar', 'amenity=pub'],
    'Discoteca': ['amenity=nightclub'],
    'Discotecas': ['amenity=nightclub']
};

const CATEGORY_LABELS = {
    'Cafetería': 'Cafetería',
    'Cafeterias': 'Cafetería',
    'Gastronomía': 'Restaurante',
    'Restaurante': 'Restaurante',
    'Restaurantes': 'Restaurante',
    'Parques': 'Parque',
    'Parque': 'Parque',
    'Cultura': 'Museo',
    'Museo': 'Museo',
    'Museos': 'Museo',
    'Iglesia': 'Iglesia',
    'Iglesias': 'Iglesia',
    'Mirador': 'Mirador',
    'Miradores': 'Mirador',
    'Entretenimiento': 'Entretenimiento',
    'Centros Comerciales': 'Centro Comercial',
    'Centro Comercial': 'Centro Comercial',
    'Centros Comercial': 'Centro Comercial',
    'Vida Nocturna': 'Vida Nocturna',
    'Bar': 'Bar',
    'Bares': 'Bar',
    'Discoteca': 'Discoteca',
    'Discotecas': 'Discoteca'
};

// Datos mock de respaldo para Quito
const MOCK_QUITO_PLACES = {
    'Cafetería': [
        { nombre: 'Café de la Vaca Centro', lat: -0.2225, lng: -78.5118, descripcion: 'Cafetería tradicional en el Centro Histórico', precio: '$', horario: '08:00–20:00' },
        { nombre: 'Isveglio Café', lat: -0.1850, lng: -78.4880, descripcion: 'Café de especialidad en La Floresta', precio: '$$', horario: '07:30–19:00' },
        { nombre: 'Café Traviesa', lat: -0.2100, lng: -78.5000, descripcion: 'Café artesanal y repostería casera', precio: '$', horario: '08:00–20:00' },
        { nombre: 'Mokka Coffee', lat: -0.1950, lng: -78.4900, descripcion: 'Especialistas en café de origen', precio: '$$', horario: '08:00–18:00' },
        { nombre: 'Café Museo', lat: -0.2200, lng: -78.5120, descripcion: 'Café dentro del Museo de la Ciudad', precio: '$', horario: '09:00–17:00' }
    ],
    'Gastronomía': [
        { nombre: 'Zazu', lat: -0.1850, lng: -78.4880, descripcion: 'Cocina ecuatoriana contemporánea', precio: '$$$', horario: '12:00–22:00' },
        { nombre: 'Nuema', lat: -0.2100, lng: -78.5000, descripcion: 'Tasting menu con ingredientes locales', precio: '$$$$', horario: '19:00–23:00' },
        { nombre: 'Café Mosaico', lat: -0.2200, lng: -78.5120, descripcion: 'Vista al Panecillo y cocina tradicional', precio: '$$', horario: '11:00–22:00' },
        { nombre: 'Hasta la Vuelta Señor', lat: -0.2180, lng: -78.5100, descripcion: 'Comida quiteña en casa patrimonial', precio: '$$', horario: '12:00–16:00' },
        { nombre: 'El Pobre Diablo', lat: -0.1900, lng: -78.4850, descripcion: 'Tapas y vinos en La Floresta', precio: '$$', horario: '18:00–00:00' }
    ],
    'Parques': [
        { nombre: 'Parque La Carolina', lat: -0.1807, lng: -78.4818, descripcion: '67 hectáreas, lago, ciclovías, deportes', precio: 'Gratis', horario: '05:00–18:00' },
        { nombre: 'Parque El Ejido', lat: -0.2050, lng: -78.5000, descripcion: 'Artesanías los fines de semana, áreas verdes', precio: 'Gratis', horario: '06:00–18:00' },
        { nombre: 'Parque Metropolitano Guangüiltagua', lat: -0.1500, lng: -78.5200, descripcion: 'Bosque nativo, senderos, miradores', precio: 'Gratis', horario: '06:00–17:00' },
        { nombre: 'Parque Bicentenario', lat: -0.1400, lng: -78.4500, descripcion: 'Antiguo aeropuerto, ahora parque urbano', precio: 'Gratis', horario: '06:00–18:00' },
        { nombre: 'Parque Itchimbía', lat: -0.2150, lng: -78.5050, descripcion: 'Mirador, centro cultural, vistas a la ciudad', precio: 'Gratis', horario: '06:00–18:00' }
    ],
    'Cultura': [
        { nombre: 'Museo de la Ciudad', lat: -0.2200, lng: -78.5120, descripcion: 'Historia de Quito en casa del siglo XVI', precio: '$', horario: '09:30–17:30' },
        { nombre: 'Museo del Carmen Alto', lat: -0.2200, lng: -78.5100, descripcion: 'Arte colonial y vida monástica', precio: '$', horario: '09:00–16:30' },
        { nombre: 'Museo Guayasamín', lat: -0.1850, lng: -78.4880, descripcion: 'Obra del maestro Oswaldo Guayasamín', precio: '$$', horario: '10:00–17:00' },
        { nombre: 'Museo Mindalae', lat: -0.1900, lng: -78.4850, descripcion: 'Culturas ancestrales del Ecuador', precio: '$', horario: '09:30–17:00' },
        { nombre: 'Centro de Arte Contemporáneo', lat: -0.2200, lng: -78.5100, descripcion: 'Exposiciones temporales en edificio histórico', precio: '$', horario: '09:00–17:00' }
    ],
    'Museo': [
        { nombre: 'Museo de la Ciudad', lat: -0.2200, lng: -78.5120, descripcion: 'Historia de Quito en casa del siglo XVI', precio: '$', horario: '09:30–17:30' },
        { nombre: 'Museo del Carmen Alto', lat: -0.2200, lng: -78.5100, descripcion: 'Arte colonial y vida monástica', precio: '$', horario: '09:00–16:30' },
        { nombre: 'Museo Guayasamín', lat: -0.1850, lng: -78.4880, descripcion: 'Obra del maestro Oswaldo Guayasamín', precio: '$$', horario: '10:00–17:00' },
        { nombre: 'Museo Mindalae', lat: -0.1900, lng: -78.4850, descripcion: 'Culturas ancestrales del Ecuador', precio: '$', horario: '09:30–17:00' },
        { nombre: 'Museo Casa del Alabado', lat: -0.2200, lng: -78.5100, descripcion: 'Arte precolombino en casa colonial', precio: '$', horario: '09:30–17:00' }
    ],
    'Iglesia': [
        { nombre: 'Basílica del Voto Nacional', lat: -0.2157, lng: -78.5073, descripcion: 'Neogótica más grande de América, torres visitables', precio: '$', horario: '09:00–17:00' },
        { nombre: 'Compañía de Jesús', lat: -0.2200, lng: -78.5120, descripcion: 'Barroca, interior dorado, Patrimonio UNESCO', precio: '$', horario: '09:30–17:30' },
        { nombre: 'San Francisco', lat: -0.2200, lng: -78.5130, descripcion: 'Convento y plaza más antigua de Quito', precio: 'Gratis', horario: '07:00–18:00' },
        { nombre: 'La Merced', lat: -0.2180, lng: -78.5100, descripcion: 'Retablo mayor y claustro colonial', precio: 'Gratis', horario: '08:00–18:00' },
        { nombre: 'Santo Domingo', lat: -0.2150, lng: -78.5080, descripcion: 'Capilla del Rosario y convento histórico', precio: 'Gratis', horario: '08:00–18:00' }
    ],
    'Mirador': [
        { nombre: 'Teleférico de Quito', lat: -0.1985, lng: -78.5195, descripcion: 'A 4.050 msnm, vista panorámica del valle', precio: '$$', horario: '09:00–17:00' },
        { nombre: 'Panecillo', lat: -0.2250, lng: -78.5150, descripcion: 'Virgen de Quito, vista 360° de la ciudad', precio: '$', horario: '09:00–18:00' },
        { nombre: 'Itchimbía', lat: -0.2150, lng: -78.5050, descripcion: 'Parque y centro cultural con vista al centro', precio: 'Gratis', horario: '06:00–18:00' },
        { nombre: 'Cruz Loma', lat: -0.1900, lng: -78.5200, descripcion: 'Punto más alto accesible en vehículo', precio: 'Gratis', horario: '06:00–18:00' },
        { nombre: 'Museo Guayasamín (mirador)', lat: -0.1850, lng: -78.4880, descripcion: 'Vista al valle desde la Capilla del Hombre', precio: '$$', horario: '10:00–17:00' }
    ],
    'Entretenimiento': [
        { nombre: 'Teatro Nacional Sucre', lat: -0.2200, lng: -78.5120, descripcion: 'Ópera, teatro, danza en edificio histórico', precio: '$$', horario: 'Según programación' },
        { nombre: 'Cine Ochoymedio', lat: -0.1900, lng: -78.4850, descripcion: 'Cine arte y festivales en La Floresta', precio: '$', horario: 'Según cartelera' },
        { nombre: 'Teatro México', lat: -0.2150, lng: -78.5080, descripcion: 'Teatro y eventos culturales', precio: '$', horario: 'Según programación' },
        { nombre: 'Casa de la Música', lat: -0.2180, lng: -78.5100, descripcion: 'Conciertos y eventos en patio colonial', precio: '$$', horario: 'Según programación' },
        { nombre: 'Quito Tenis y Golf Club', lat: -0.1600, lng: -78.4700, descripcion: 'Deportes, piscina, restaurante', precio: '$$$', horario: '06:00–22:00' }
    ],
    'Centros Comerciales': [
        { nombre: 'Quicentro Shopping', lat: -0.1800, lng: -78.4800, descripcion: 'Gran mall con cine, patio de comidas', precio: 'Variable', horario: '10:00–21:00' },
        { nombre: 'Centro Comercial El Jardín', lat: -0.1500, lng: -78.4500, descripcion: 'Tiendas, supermercado, cine', precio: 'Variable', horario: '10:00–21:00' },
        { nombre: 'Mall El Recreo', lat: -0.2300, lng: -78.5300, descripcion: 'Compras, cine, restaurantes', precio: 'Variable', horario: '10:00–21:00' },
        { nombre: 'Centro Comercial Iñaquito (CCI)', lat: -0.1850, lng: -78.4880, descripcion: 'Compras y servicios en el norte', precio: 'Variable', horario: '10:00–21:00' },
        { nombre: 'Mall del Sol', lat: -0.2300, lng: -78.5300, descripcion: 'Entretenimiento y compras al sur', precio: 'Variable', horario: '10:00–21:00' }
    ],
    'Vida Nocturna': [
        { nombre: 'La Bocana', lat: -0.1900, lng: -78.4850, descripcion: 'Bar con música en vivo en La Floresta', precio: '$$', horario: '19:00–02:00' },
        { nombre: 'Santo Domingo Bar', lat: -0.2150, lng: -78.5080, descripcion: 'Coctelería en centro histórico', precio: '$$', horario: '18:00–01:00' },
        { nombre: 'Café Libro', lat: -0.1850, lng: -78.4880, descripcion: 'Libros, café y copas en ambiente cultural', precio: '$$', horario: '10:00–00:00' },
        { nombre: 'Pub 1800', lat: -0.2180, lng: -78.5100, descripcion: 'Pub tradicional quiteño', precio: '$', horario: '17:00–01:00' },
        { nombre: 'Bungalow 6', lat: -0.1800, lng: -78.4800, descripcion: 'Discoteca y eventos en Cumbayá', precio: '$$$', horario: '22:00–04:00' }
    ]
};

// Aliases para categorías (singular/plural/alternativas) - definidos después del objeto principal
MOCK_QUITO_PLACES['Parque'] = MOCK_QUITO_PLACES['Parques'];
MOCK_QUITO_PLACES['Restaurante'] = MOCK_QUITO_PLACES['Gastronomía'];
MOCK_QUITO_PLACES['Restaurantes'] = MOCK_QUITO_PLACES['Gastronomía'];
MOCK_QUITO_PLACES['Museos'] = MOCK_QUITO_PLACES['Museo'];
MOCK_QUITO_PLACES['Iglesias'] = MOCK_QUITO_PLACES['Iglesia'];
MOCK_QUITO_PLACES['Miradores'] = MOCK_QUITO_PLACES['Mirador'];
MOCK_QUITO_PLACES['Centro Comercial'] = MOCK_QUITO_PLACES['Centros Comerciales'];
MOCK_QUITO_PLACES['Centros Comercial'] = MOCK_QUITO_PLACES['Centros Comerciales'];
MOCK_QUITO_PLACES['Bar'] = MOCK_QUITO_PLACES['Vida Nocturna'];
MOCK_QUITO_PLACES['Bares'] = MOCK_QUITO_PLACES['Vida Nocturna'];
MOCK_QUITO_PLACES['Discoteca'] = MOCK_QUITO_PLACES['Vida Nocturna'];
MOCK_QUITO_PLACES['Discotecas'] = MOCK_QUITO_PLACES['Vida Nocturna'];

function buildOverpassQuery(category, lat, lng, radius) {
    const tags = OSM_TAGS_BY_CATEGORY[category] || ['tourism=attraction'];
    const tagFilters = tags.map(t => `[${t}]`).join('');
    
    return `
        [out:json][timeout:25];
        (
            node${tagFilters}(around:${radius},${lat},${lng});
            way${tagFilters}(around:${radius},${lat},${lng});
            relation${tagFilters}(around:${radius},${lat},${lng});
        );
        out center tags;
    `;
}

function extractCenter(element) {
    if (element.lat && element.lon) {
        return { lat: element.lat, lon: element.lon };
    }
    if (element.center) {
        return { lat: element.center.lat, lon: element.center.lon };
    }
    if (element.geometry && element.geometry.length > 0) {
        return { lat: element.geometry[0].lat, lon: element.geometry[0].lon };
    }
    return null;
}

function buildDescription(tags, category) {
    const parts = [];
    
    if (tags['addr:street']) {
        parts.push(`${tags['addr:street']}${tags['addr:housenumber'] ? ` ${tags['addr:housenumber']}` : ''}`);
    } else if (tags['addr:city']) {
        parts.push(tags['addr:city']);
    }
    
    const typeMap = {
        'amenity': { 'cafe': 'Cafetería', 'restaurant': 'Restaurante', 'bar': 'Bar', 'pub': 'Pub', 'nightclub': 'Discoteca', 'place_of_worship': 'Iglesia' },
        'tourism': { 'museum': 'Museo', 'viewpoint': 'Mirador', 'attraction': 'Atracción turística' },
        'leisure': { 'park': 'Parque' },
        'shop': { 'mall': 'Centro comercial' }
    };
    
    let typeLabel = '';
    for (const [key, values] of Object.entries(typeMap)) {
        if (tags[key] && values[tags[key]]) {
            typeLabel = values[tags[key]];
            break;
        }
    }
    
    if (typeLabel) parts.unshift(typeLabel);
    
    return parts.join(' · ') || `Lugar de ${CATEGORY_LABELS[category] || category.toLowerCase()}`;
}

function buildPhotoUrl(element) {
    if (element.tags && element.tags.image) {
        return element.tags.image;
    }
    if (element.tags && element.tags.wikipedia) {
        return `https://en.wikipedia.org/wiki/${encodeURIComponent(element.tags.wikipedia)}`;
    }
    return null;
}

function mapearLugarOverpass(element, category) {
    const center = extractCenter(element);
    if (!center) return null;
    
    const tags = element.tags || {};
    const id = `${element.type}${element.id}`;
    
    return {
        id,
        nombre: tags.name || tags['name:es'] || tags['name:en'] || `Punto de interés ${id}`,
        categoria: CATEGORY_LABELS[category] || category,
        descripcion: buildDescription(tags, category),
        latitud: center.lat.toString(),
        longitud: center.lon.toString(),
        precio: null,
        horario: tags.opening_hours || 'Horario no disponible',
        photoUrl: buildPhotoUrl(element),
        rating: null,
        user_ratings_total: null,
        types: [element.type],
        vicinity: tags['addr:street'] || tags['addr:city'] || 'Quito',
        source: 'overpass',
        osm_id: element.id,
        osm_type: element.type
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                return response;
            }
            
            if (response.status === 429) {
                const retryAfter = response.headers.get('retry-after');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY_BASE * Math.pow(2, attempt);
                console.warn(`⚠️ Rate limited (429). Waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
                await sleep(waitTime);
                continue;
            }
            
            if (response.status >= 500) {
                const waitTime = RETRY_DELAY_BASE * Math.pow(2, attempt);
                console.warn(`⚠️ Server error ${response.status}. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries})`);
                await sleep(waitTime);
                continue;
            }
            
            const error = await response.text();
            throw new Error(`Overpass API error: ${response.status} - ${error}`);
            
        } catch (error) {
            lastError = error;
            
            if (error.name === 'AbortError') {
                console.warn(`⚠️ Request timeout (${REQUEST_TIMEOUT}ms). Retrying...`);
            }
            
            if (attempt < retries) {
                const waitTime = RETRY_DELAY_BASE * Math.pow(2, attempt);
                console.warn(`⚠️ Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${waitTime}ms...`);
                await sleep(waitTime);
            }
        }
    }
    
    throw lastError;
}

export async function buscarLugaresOverpass(categoria, lat = QUITO_CENTER.lat, lng = QUITO_CENTER.lng, radius = DEFAULT_RADIUS) {
    const query = buildOverpassQuery(categoria, lat, lng, radius);
    
    console.log(`🔍 Buscando en Overpass: ${categoria} cerca de ${lat},${lng} (radio: ${radius}m)`);
    
    try {
        const response = await fetchWithRetry(OVERPASS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(query)}`
        });
        
        const data = await response.json();
        
        const lugares = (data.elements || [])
            .map(el => mapearLugarOverpass(el, categoria))
            .filter(Boolean)
            .slice(0, 20);
        
        console.log(`✅ Overpass: ${lugares.length} resultados para ${categoria}`);
        return lugares;
        
    } catch (error) {
        console.error(`❌ Error en Overpass para ${categoria}:`, error.message);
        throw error;
    }
}

function getMockPlaces(categoria) {
    const mocks = MOCK_QUITO_PLACES[categoria] || [];
    return mocks.map((m, i) => ({
        id: `mock_${categoria}_${i}`,
        nombre: m.nombre,
        categoria: CATEGORY_LABELS[categoria] || categoria,
        descripcion: m.descripcion,
        latitud: m.lat.toString(),
        longitud: m.lng.toString(),
        precio: m.precio,
        horario: m.horario,
        photoUrl: null,
        rating: null,
        user_ratings_total: null,
        types: ['mock'],
        vicinity: 'Quito',
        source: 'mock',
        mock: true
    }));
}

export async function buscarLugaresConFallback(categoria, lat = QUITO_CENTER.lat, lng = QUITO_CENTER.lng, radius = DEFAULT_RADIUS, cacheGet, cacheSet) {
    const cacheKey = `overpass:${categoria}:${lat.toFixed(4)},${lng.toFixed(4)}:r${radius}`;
    
    // 1. Intentar caché primero
    if (cacheGet) {
        const cached = await cacheGet(cacheKey);
        if (cached) {
            console.log(`💾 Cache HIT para ${cacheKey}`);
            return { lugares: cached, fuente: 'cache', categoria, total: cached.length };
        }
    }
    
    // 2. Intentar Overpass API con reintentos
    try {
        console.log(`🌐 Cache MISS - consultando Overpass para ${categoria}`);
        const lugares = await buscarLugaresOverpass(categoria, lat, lng, radius);
        
        if (cacheSet && lugares.length > 0) {
            await cacheSet(cacheKey, lugares);
        }
        
        return { lugares, fuente: 'overpass', categoria, total: lugares.length };
        
    } catch (overpassError) {
        console.warn(`⚠️ Overpass falló para ${categoria}: ${overpassError.message}. Usando datos mock...`);
        
        // 3. Fallback a datos mock
        const mockPlaces = getMockPlaces(categoria);
        
        if (cacheSet && mockPlaces.length > 0) {
            await cacheSet(cacheKey, mockPlaces);
        }
        
        return { 
            lugares: mockPlaces, 
            fuente: 'mock', 
            categoria, 
            total: mockPlaces.length,
            warning: 'Datos de respaldo (Overpass no disponible)' 
        };
    }
}

export function getCategoriasDisponibles() {
    return Object.keys(OSM_TAGS_BY_CATEGORY);
}

export { QUITO_CENTER, DEFAULT_RADIUS };