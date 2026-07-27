import fetch from 'node-fetch';

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

const CATEGORIAS_GOOGLE = {
    'Cafetería': 'cafe',
    'Gastronomía': 'restaurant',
    'Parques': 'park',
    'Cultura': 'museum',
    'Museo': 'museum',
    'Iglesia': 'church',
    'Mirador': 'tourist_attraction',
    'Entretenimiento': 'amusement_park',
    'Centros Comerciales': 'shopping_mall',
    'Vida Nocturna': 'night_club'
};

const QUITO_CENTER = { lat: -0.2298, lng: -78.5249 };
const RADIO_BUSQUEDA = 5000;

function normalizarCategoria(categoria) {
    return CATEGORIAS_GOOGLE[categoria] || 'point_of_interest';
}

function buildPhotoUrl(photoReference) {
    if (!photoReference) return null;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

function mapearLugarGoogle(place, categoriaSolicitada) {
    const photos = place.photos || [];
    const photoUrl = photos.length > 0 ? buildPhotoUrl(photos[0].photo_reference) : null;

    return {
        id: place.place_id,
        nombre: place.name,
        categoria: categoriaSolicitada,
        descripcion: place.editorial_summary?.overview || place.vicinity || 'Sin descripción disponible',
        latitud: place.geometry?.location?.lat?.toString() || '0',
        longitud: place.geometry?.location?.lng?.toString() || '0',
        precio: place.price_level !== undefined ? '$'.repeat(Math.min(place.price_level + 1, 4)) : '$$',
        horario: place.opening_hours?.open_now !== undefined 
            ? (place.opening_hours.open_now ? 'Abierto ahora' : 'Cerrado') 
            : 'Horario no disponible',
        photoUrl,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        types: place.types,
        vicinity: place.vicinity
    };
}

export async function buscarLugaresGoogle(categoria, lat = QUITO_CENTER.lat, lng = QUITO_CENTER.lng, radio = RADIO_BUSQUEDA) {
    if (!GOOGLE_API_KEY) {
        throw new Error('GOOGLE_PLACES_API_KEY no configurada');
    }

    const tipoGoogle = normalizarCategoria(categoria);
    const url = new URL(`${BASE_URL}/nearbysearch/json`);
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', radio.toString());
    url.searchParams.set('type', tipoGoogle);
    url.searchParams.set('key', GOOGLE_API_KEY);
    url.searchParams.set('language', 'es');

    console.log(`🔍 Buscando en Google Places: ${categoria} (${tipoGoogle}) cerca de ${lat},${lng}`);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Places API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API status: ${data.status} - ${data.error_message || 'Sin detalles'}`);
    }

    const lugares = (data.results || []).slice(0, 20).map(p => mapearLugarGoogle(p, categoria));
    
    console.log(`✅ Google Places: ${lugares.length} resultados para ${categoria}`);
    return lugares;
}

export async function buscarDetalleLugar(placeId) {
    if (!GOOGLE_API_KEY) throw new Error('GOOGLE_PLACES_API_KEY no configurada');

    const url = new URL(`${BASE_URL}/details/json`);
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'name,formatted_address,geometry,photos,rating,user_ratings_total,price_level,opening_hours,editorial_summary,types,vicinity');
    url.searchParams.set('key', GOOGLE_API_KEY);
    url.searchParams.set('language', 'es');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
        throw new Error(`Google Place Details error: ${data.status}`);
    }

    return data.result;
}