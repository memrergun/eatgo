// Venues.json'ı Supabase'e aktar
// Kullanım: node scripts/import-supabase.js
//
// Önce .env dosyasına şunları yaz:
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY=eyJ...  (service_role key — Dashboard > Settings > API)

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs    = require('fs');
const path  = require('path');
const axios = require('axios');

const URL  = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!URL || !KEY) {
  console.error('❌  .env dosyasında SUPABASE_URL ve SUPABASE_SERVICE_KEY eksik.');
  process.exit(1);
}

const raw    = fs.readFileSync(path.join(__dirname, '../data/venues.json'), 'utf8');
const venues = JSON.parse(raw).venues || JSON.parse(raw);

const headers = {
  'apikey':        KEY,
  'Authorization': 'Bearer ' + KEY,
  'Content-Type':  'application/json',
  'Prefer':        'resolution=merge-duplicates'   // upsert
};

async function run() {
  console.log(`📦 ${venues.length} mekan aktarılıyor...`);
  let ok = 0, fail = 0;

  for (const v of venues) {
    const row = {
      id:           v.id,
      name:         v.name,
      slug:         v.slug,
      category:     v.category || null,
      lat:          v.location?.coordinates?.lat  || null,
      lng:          v.location?.coordinates?.lng  || null,
      rating:       v.rating?.overall             || null,
      review_count: v.rating?.reviewCount         || null,
      price_range:  v.pricing?.range              || null,
      featured:     v.featured                    || false,
      data:         v
    };

    try {
      await axios.post(`${URL}/rest/v1/venues`, row, { headers });
      console.log(`  ✓ ${v.name}`);
      ok++;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error(`  ✗ ${v.name}: ${msg}`);
      fail++;
    }
  }

  console.log(`\n✅ Bitti — ${ok} başarılı, ${fail} hatalı`);
}

run().catch(console.error);
