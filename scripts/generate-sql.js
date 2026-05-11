// venues.json → SQL  (Supabase SQL Editor'a yapıştır)
// Kullanım:  node scripts/generate-sql.js > import.sql

const fs   = require('fs');
const path = require('path');

const raw    = fs.readFileSync(path.join(__dirname, '../data/venues.json'), 'utf8');
const venues = JSON.parse(raw).venues || JSON.parse(raw);

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean')        return v ? 'true' : 'false';
  if (typeof v === 'number')         return String(v);
  if (typeof v === 'object')         return "'" + JSON.stringify(v).replace(/'/g, "''") + "'";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

const lines = venues.map(v => {
  const id           = esc(v.id);
  const name         = esc(v.name);
  const slug         = esc(v.slug);
  const category     = esc(v.category || null);
  const lat          = esc(v.location?.coordinates?.lat  ?? null);
  const lng          = esc(v.location?.coordinates?.lng  ?? null);
  const rating       = esc(v.rating?.overall             ?? null);
  const review_count = esc(v.rating?.reviewCount         ?? null);
  const price_range  = esc(v.pricing?.range              ?? null);
  const featured     = esc(v.featured || false);
  const data         = esc(v);

  return (
    `INSERT INTO venues (id, name, slug, category, lat, lng, rating, review_count, price_range, featured, data)\n` +
    `VALUES (${id}, ${name}, ${slug}, ${category}, ${lat}, ${lng}, ${rating}, ${review_count}, ${price_range}, ${featured}, ${data}::jsonb)\n` +
    `ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, category=EXCLUDED.category,\n` +
    `  lat=EXCLUDED.lat, lng=EXCLUDED.lng, rating=EXCLUDED.rating, review_count=EXCLUDED.review_count,\n` +
    `  price_range=EXCLUDED.price_range, featured=EXCLUDED.featured, data=EXCLUDED.data, updated_at=now();`
  );
});

console.log('-- EatGo venues import');
console.log('-- Supabase SQL Editor\'a yapıştır\n');
console.log(lines.join('\n\n'));
console.log('\n-- Bitti: ' + venues.length + ' mekan');
