// ============================================================
//  EatGo — Supabase bağlantı ayarları
//  Supabase projesini oluşturduktan sonra aşağıdaki değerleri doldur:
//  Dashboard > Project Settings > API
// ============================================================

window.SUPABASE_URL      = 'https://wbnkyogwmmrawjfwlnyt.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_pILF9yjENy1rSlxb8Fk8KA_G1jR0u9y';

// ============================================================
//  DB yardımcıları  (venue.html ve app.js tarafından kullanılır)
// ============================================================

window.DB = {

  _ready: function () {
    return window.SUPABASE_URL && !window.SUPABASE_URL.includes('PROJE_ID');
  },

  _headers: function () {
    return {
      'apikey':        window.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY
    };
  },

  // Tüm mekanları getir (harita + feed için)
  fetchVenues: async function () {
    var resp = await fetch(
      window.SUPABASE_URL + '/rest/v1/venues?select=data&order=rating.desc&limit=200',
      { headers: this._headers() }
    );
    if (!resp.ok) throw new Error('Supabase HTTP ' + resp.status);
    var rows = await resp.json();
    return rows.map(function (r) { return r.data; });
  },

  // Harita için sadece düz kolonlar (lat/lng/name/slug/category/rating) — çok daha hafif
  fetchVenuesMap: async function (limit) {
    var lim = limit || 3000;
    var resp = await fetch(
      window.SUPABASE_URL + '/rest/v1/venues?select=name,slug,category,lat,lng,rating,review_count&order=rating.desc&limit=' + lim,
      { headers: this._headers() }
    );
    if (!resp.ok) throw new Error('Supabase HTTP ' + resp.status);
    return await resp.json();
  },

  // Tek mekan getir (venue.html için)
  fetchVenue: async function (slug) {
    var resp = await fetch(
      window.SUPABASE_URL + '/rest/v1/venues?slug=eq.' + encodeURIComponent(slug) + '&select=data,menu_url&limit=1',
      { headers: this._headers() }
    );
    if (!resp.ok) throw new Error('Supabase HTTP ' + resp.status);
    var rows = await resp.json();
    if (!rows[0] || !rows[0].data) return null;
    var venue = rows[0].data;
    if (rows[0].menu_url) venue.menu_url = rows[0].menu_url;
    return venue;
  }

};
