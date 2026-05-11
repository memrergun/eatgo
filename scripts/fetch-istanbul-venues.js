// İstanbul merkezinden 15 km yarıçaplı grid'de mekan çek → Supabase'e aktar
// Kullanım: node scripts/fetch-istanbul-venues.js
// Tahmini API çağrısı: ~300 (ücretsiz kota içinde)

const fs    = require('fs');
const path  = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

const API_KEY   = 'AIzaSyApsshzyL42u5DqGzi_80bMsdGDL1XnW3c';
const PLACES_V1 = 'https://places.googleapis.com/v1/places:searchNearby';

// İstanbul merkezi (Eminönü)
const CENTER    = { lat: 41.0082, lng: 28.9784 };
const GRID_KM   = 3;      // grid aralığı
const RADIUS_M  = 2000;   // her nokta arama yarıçapı (m)
const COVER_KM  = 30;     // merkeze maksimum uzaklık (tüm İstanbul)

const TYPES = ['restaurant', 'cafe', 'bar', 'bakery'];

const CATEGORY_MAP = {
  restaurant:'Restoran', cafe:'Kafeterya', bar:'Bar', bakery:'Pastane',
  meal_takeaway:'Restoran', meal_delivery:'Restoran', food:'Restoran',
  coffee_shop:'Kafeterya', fast_food_restaurant:'Fast Food',
  pizza_restaurant:'Pizza', hamburger_restaurant:'Burger',
  seafood_restaurant:'Deniz Ürünleri', turkish_restaurant:'Restoran',
  breakfast_restaurant:'Kahvaltı'
};

const PRICE_MAP = { PRICE_LEVEL_INEXPENSIVE:'₺', PRICE_LEVEL_MODERATE:'₺₺', PRICE_LEVEL_EXPENSIVE:'₺₺₺', PRICE_LEVEL_VERY_EXPENSIVE:'₺₺₺₺' };

const DAY_MAP = ['pazar','pazartesi','salı','çarşamba','perşembe','cuma','cumartesi'];

// Türkçe karakter → ASCII slug
function slugify(str) {
  return str.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// Koordinat farkı km → derece
function kmToLat(km) { return km / 111; }
function kmToLng(km) { return km / (111 * Math.cos(CENTER.lat * Math.PI / 180)); }

// Grid noktaları oluştur (merkeze ≤ COVER_KM)
function buildGrid() {
  const points = [];
  const steps  = Math.ceil(COVER_KM / GRID_KM);
  for (let di = -steps; di <= steps; di++) {
    for (let dj = -steps; dj <= steps; dj++) {
      const lat = CENTER.lat + di * kmToLat(GRID_KM);
      const lng = CENTER.lng + dj * kmToLng(GRID_KM);
      const dist = Math.sqrt(Math.pow(di * GRID_KM, 2) + Math.pow(dj * GRID_KM, 2));
      if (dist <= COVER_KM) points.push({ lat, lng });
    }
  }
  return points;
}

// Tek nokta + tek type için arama
async function searchNearby(lat, lng, type) {
  const resp = await axios.post(PLACES_V1, {
    includedTypes: [type],
    maxResultCount: 20,
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius: RADIUS_M }
    }
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': [
        'places.id','places.displayName','places.formattedAddress',
        'places.location','places.rating','places.userRatingCount',
        'places.priceLevel','places.primaryType','places.types',
        'places.photos','places.regularOpeningHours',
        'places.nationalPhoneNumber','places.websiteUri','places.businessStatus'
      ].join(',')
    },
    timeout: 15000
  });
  return resp.data.places || [];
}

// Place → venue satırı
function placeToRow(p) {
  const name     = p.displayName?.text || 'İsimsiz';
  const baseSlug = slugify(name);
  const primary  = p.primaryType || (p.types || [])[0] || 'restaurant';
  const category = CATEGORY_MAP[primary] || 'Restoran';
  const lat      = p.location?.latitude;
  const lng      = p.location?.longitude;
  const photos   = (p.photos || []).slice(0, 6).map(ph =>
    `https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=1200&key=${API_KEY}`
  );

  let hours = {};
  if (p.regularOpeningHours?.periods) {
    p.regularOpeningHours.periods.forEach(period => {
      if (!period.open) return;
      const day  = DAY_MAP[period.open.day];
      const open = String(period.open.hour||0).padStart(2,'0')+':'+String(period.open.minute||0).padStart(2,'0');
      const close= period.close
        ? String(period.close.hour||0).padStart(2,'0')+':'+String(period.close.minute||0).padStart(2,'0')
        : '00:00';
      hours[day] = open + '-' + close;
    });
  }

  const data = {
    id:       p.id,
    name,
    slug:     baseSlug,
    category,
    location: {
      address:      p.formattedAddress || '',
      neighborhood: (p.formattedAddress || '').split(',')[1]?.trim() || 'İstanbul',
      city:         'İstanbul',
      coordinates:  { lat, lng }
    },
    media:   { coverImage: photos[0] || '', gallery: photos },
    rating:  { overall: p.rating || 0, reviewCount: p.userRatingCount || 0 },
    pricing: { range: PRICE_MAP[p.priceLevel] || '₺₺' },
    hours,
    contact: { phone: p.nationalPhoneNumber || '', website: p.websiteUri || '' },
    reviews: [],
    featured: false
  };

  return {
    id:           p.id,
    name,
    slug:         baseSlug,
    category,
    lat,
    lng,
    rating:       p.rating || null,
    review_count: p.userRatingCount || null,
    price_range:  PRICE_MAP[p.priceLevel] || null,
    featured:     false,
    data
  };
}

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean')        return v ? 'true' : 'false';
  if (typeof v === 'number')         return String(v);
  if (typeof v === 'object')         return "'" + JSON.stringify(v).replace(/'/g,"''") + "'";
  return "'" + String(v).replace(/'/g,"''") + "'";
}

async function run() {
  const grid   = buildGrid();
  const seen   = new Set();
  const rows   = [];
  let   apiCalls = 0;

  console.log(`📍 ${grid.length} grid noktası × ${TYPES.length} tip = maks ${grid.length * TYPES.length} API çağrısı`);

  for (const point of grid) {
    for (const type of TYPES) {
      try {
        const places = await searchNearby(point.lat, point.lng, type);
        apiCalls++;
        for (const p of places) {
          if (!p.id || seen.has(p.id)) continue;
          seen.add(p.id);
          rows.push(placeToRow(p));
        }
        process.stdout.write(`\r✅ ${apiCalls} çağrı | ${rows.length} benzersiz mekan`);
        await new Promise(r => setTimeout(r, 150));
      } catch (e) {
        process.stdout.write(`\r⚠️  ${point.lat.toFixed(3)},${point.lng.toFixed(3)} ${type}: ${e.response?.data?.error?.message || e.message}\n`);
      }
    }
  }

  console.log(`\n\n📦 ${rows.length} mekan bulundu, SQL üretiliyor...`);

  // Slug çakışmalarını çöz
  const slugCount = {};
  rows.forEach(r => {
    slugCount[r.slug] = (slugCount[r.slug] || 0) + 1;
    if (slugCount[r.slug] > 1) {
      r.slug        += '-' + slugCount[r.slug];
      r.data.slug    = r.slug;
    }
  });

  const sqls = rows.map(r => {
    const d = r.data;
    return (
      `INSERT INTO venues (id,name,slug,category,lat,lng,rating,review_count,price_range,featured,data)\n` +
      `VALUES (${esc(r.id)},${esc(r.name)},${esc(r.slug)},${esc(r.category)},${esc(r.lat)},${esc(r.lng)},` +
      `${esc(r.rating)},${esc(r.review_count)},${esc(r.price_range)},${esc(r.featured)},${esc(d)}::jsonb)\n` +
      `ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,category=EXCLUDED.category,` +
      `lat=EXCLUDED.lat,lng=EXCLUDED.lng,rating=EXCLUDED.rating,review_count=EXCLUDED.review_count,` +
      `price_range=EXCLUDED.price_range,data=EXCLUDED.data,updated_at=now();`
    );
  });

  const outSql = path.join(__dirname, '../istanbul-venues.sql');
  fs.writeFileSync(outSql, sqls.join('\n\n') + '\n');

  const outJson = path.join(__dirname, '../istanbul-venues-raw.json');
  fs.writeFileSync(outJson, JSON.stringify(rows, null, 2));

  console.log(`✅ istanbul-venues.sql (${rows.length} mekan) → şimdi Supabase'e aktarılıyor...`);

  try {
    execSync(
      `npx supabase db query --linked --file "${outSql}"`,
      { env: { ...process.env, SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN }, stdio: 'inherit' }
    );
    console.log('✅ Supabase aktarım tamamlandı!');
  } catch (e) {
    console.log('⚠️  Supabase aktarım için elle çalıştır:');
    console.log('   SUPABASE_ACCESS_TOKEN=... npx supabase db query --linked --file istanbul-venues.sql');
  }
}

run().catch(console.error);
