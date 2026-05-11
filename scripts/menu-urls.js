// menücebimde kodlarını buraya yaz
// Menü sayfasının URL'i: https://menucebimde.com/?menuid=XXXXX
// Bulamazsan null bırak
// Sonra: node scripts/menu-urls.js

const MENUS = [
  { slug: 'aida-vino-e-cucina',              menuid: null },
  { slug: 'ala-kadikoy-meyhane',             menuid: null },
  { slug: 'ayik-corba-kebap',                menuid: null },
  { slug: 'balikci-lokantasi',               menuid: null },
  { slug: 'calaka-ik-kadikoy',               menuid: null },
  { slug: 'ciya-sofrasi',                    menuid: null },
  { slug: 'deni-z-yildizi-restaurant',       menuid: null },
  { slug: 'ethique-patisserie-boulangerie',  menuid: null },
  { slug: 'fabesco-restaurant-caf',          menuid: null },
  { slug: 'forchetta-plus-kadikoy',          menuid: null },
  { slug: 'hane-kadikoy',                    menuid: null },
  { slug: 'kadikoy-midyecisi',               menuid: null },
  { slug: 'kadikoy-semtin-koftecisi',        menuid: null },
  { slug: 'kadikoy-sofrasi',                 menuid: null },
  { slug: 'kimyon-kadikoy',                  menuid: null },
  { slug: 'koco-restaurant',                 menuid: null },
  { slug: 'ouzo-roof-restaurant',            menuid: null },
  { slug: 'palegg',                          menuid: null },
  { slug: 'the-townhouse',                   menuid: null },
  { slug: 'yanyali-fehmi-lokantasi',         menuid: null },
];

// --- Aşağısını değiştirme ---
const fs   = require('fs');
const path = require('path');

const rows = MENUS.filter(r => r.menuid);
if (!rows.length) {
  console.log('Henüz kod girilmemiş. menuid alanlarını doldur.');
  process.exit(0);
}

const sql = rows.map(r => {
  const url = 'https://menucebimde.com/?menuid=' + r.menuid;
  return `UPDATE venues SET menu_url = '${url}' WHERE slug = '${r.slug}';`;
}).join('\n') + '\n';

const out = path.join(__dirname, '../set-menus.sql');
fs.writeFileSync(out, sql);
console.log(`${rows.length} güncelleme → set-menus.sql`);
