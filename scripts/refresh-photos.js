// Tüm mekanların fotoğraflarını yeni Places API v1'den çekip Supabase'i güncelle
// Kullanım: node scripts/refresh-photos.js

const fs    = require('fs');
const path  = require('path');
const axios = require('axios');

const API_KEY      = 'AIzaSyApsshzyL42u5DqGzi_80bMsdGDL1XnW3c';
const PLACES_BASE  = 'https://places.googleapis.com/v1';
const MAX_GALLERY  = 6;

const raw    = fs.readFileSync(path.join(__dirname, '../data/venues.json'), 'utf8');
const venues = JSON.parse(raw).venues || JSON.parse(raw);

function photoUrl(name, maxWidth = 1200) {
  return `${PLACES_BASE}/${name}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
}

async function fetchPhotoNames(placeId) {
  const url = `${PLACES_BASE}/places/${placeId}?key=${API_KEY}`;
  const res  = await axios.get(url, {
    headers: { 'X-Goog-FieldMask': 'photos.name' },
    timeout: 10000
  });
  return (res.data.photos || []).map(p => p.name);
}

async function run() {
  const sqls = [];

  for (const v of venues) {
    process.stdout.write(`  ${v.name}... `);
    try {
      const names = await fetchPhotoNames(v.id);
      if (!names.length) { console.log('fotoğraf yok'); continue; }

      const coverUrl   = photoUrl(names[0]);
      const galleryUrls = names.slice(0, MAX_GALLERY).map(n => photoUrl(n));

      // JSON patch — sadece media alanını güncelle
      const patch = JSON.stringify({ coverImage: coverUrl, gallery: galleryUrls })
                      .replace(/'/g, "''");

      sqls.push(
        `UPDATE venues SET ` +
        `data = jsonb_set(jsonb_set(data, '{media,coverImage}', '"${coverUrl.replace(/'/g,"''")}"`+`'::jsonb), '{media,gallery}', '${JSON.stringify(galleryUrls).replace(/'/g,"''")}'), ` +
        `updated_at = now() ` +
        `WHERE id = '${v.id}';`
      );
      console.log(`✓ (${names.length} fotoğraf)`);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 200)); // rate limit
  }

  const outPath = path.join(__dirname, '../update-photos.sql');
  fs.writeFileSync(outPath, sqls.join('\n') + '\n');
  console.log(`\n✅ ${sqls.length} güncelleme → update-photos.sql`);
}

run().catch(console.error);
