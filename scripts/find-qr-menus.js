// Supabase'deki menu_url'siz mekanlar için menücebimde QR menü linki bul
// Kullanım: node scripts/find-qr-menus.js
// DuckDuckGo HTML üzerinden arama yapar (API key gerektirmez)

const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://wbnkyogwmmrawjfwlnyt.supabase.co';
const ANON_KEY     = 'sb_publishable_pILF9yjENy1rSlxb8Fk8KA_G1jR0u9y';

// menücebimde URL'inden menuid çıkar
function extractMenuId(url) {
  const m = url.match(/[?&]menuid=([A-Z0-9a-z]+)/);
  return m ? m[1] : null;
}

// DuckDuckGo'da menücebimde linki ara
async function findMenuUrl(venueName) {
  const query = encodeURIComponent(`"${venueName}" menücebimde`);
  try {
    const resp = await axios.get(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const html = resp.data;
    // menucebimde.com linklerini çıkar
    const matches = [...html.matchAll(/menucebimde\.com[^"'\s]*/gi)];
    for (const m of matches) {
      const url = 'https://' + m[0].replace(/&amp;/g, '&');
      const menuid = extractMenuId(url);
      if (menuid) return `https://menucebimde.com/?menuid=${menuid}`;
      // slug formatı da dene: menucebimde.com/restoran-adi
      if (m[0].includes('/') && !m[0].includes('?')) {
        const slug = m[0].split('/').filter(Boolean).pop();
        if (slug && slug.length > 2 && !slug.includes('.')) {
          return 'https://menucebimde.com/' + slug;
        }
      }
    }
  } catch (e) {
    // sessiz geç
  }
  return null;
}

async function run() {
  // menu_url'siz mekanları Supabase'den çek
  const resp = await axios.get(
    `${SUPABASE_URL}/rest/v1/venues?menu_url=is.null&select=slug,name&limit=200`,
    { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
  );
  const venues = resp.data;
  console.log(`🔍 ${venues.length} mekan için QR menü aranıyor...\n`);

  const found = [];
  for (const v of venues) {
    process.stdout.write(`  ${v.name}... `);
    const url = await findMenuUrl(v.name);
    if (url) {
      console.log(`✓ ${url}`);
      found.push({ slug: v.slug, menu_url: url });
    } else {
      console.log('bulunamadı');
    }
    await new Promise(r => setTimeout(r, 1200)); // DuckDuckGo rate limit
  }

  if (!found.length) {
    console.log('\nHiç menü bulunamadı.');
    return;
  }

  const sql = found.map(f =>
    `UPDATE venues SET menu_url = '${f.menu_url.replace(/'/g,"''")}' WHERE slug = '${f.slug}';`
  ).join('\n') + '\n';

  const outPath = path.join(__dirname, '../set-menus.sql');
  fs.writeFileSync(outPath, sql);
  console.log(`\n✅ ${found.length} menü bulundu → set-menus.sql`);

  try {
    execSync(
      `npx supabase db query --linked --file "${outPath}"`,
      { env: { ...process.env, SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN }, stdio: 'inherit' }
    );
    console.log('✅ Supabase güncellendi!');
  } catch (e) {
    console.log('Elle çalıştır: SUPABASE_ACCESS_TOKEN=... npx supabase db query --linked --file set-menus.sql');
  }
}

run().catch(console.error);
