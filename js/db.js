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
  fetchVenues: async function (offset, limit) {
    var lim = limit || 200;
    var off = offset || 0;
    var resp = await fetch(
      window.SUPABASE_URL + '/rest/v1/venues?select=data&order=rating.desc&limit=' + lim + '&offset=' + off,
      { headers: this._headers() }
    );
    if (!resp.ok) throw new Error('Supabase HTTP ' + resp.status);
    var rows = await resp.json();
    return rows.map(function (r) { return r.data; });
  },

  // Yakın mekanlar — bounding box ile Supabase filtresi (lat/lng düz kolonlar), tam veri döner
  fetchVenuesNearby: async function (lat, lng, radiusKm) {
    var r = radiusKm || 3;
    var dLat = r / 111;
    var dLng = r / (111 * Math.cos(lat * Math.PI / 180));
    var q = 'select=data'
      + '&lat=gte.' + (lat - dLat).toFixed(6)
      + '&lat=lte.' + (lat + dLat).toFixed(6)
      + '&lng=gte.' + (lng - dLng).toFixed(6)
      + '&lng=lte.' + (lng + dLng).toFixed(6)
      + '&order=rating.desc&limit=1000';
    var resp = await fetch(window.SUPABASE_URL + '/rest/v1/venues?' + q, { headers: this._headers() });
    if (!resp.ok) throw new Error('Supabase HTTP ' + resp.status);
    var rows = await resp.json();
    return rows.map(function (r) { return r.data; });
  },

  // Harita için düz kolonlar — localStorage cache (30 dk), ilk açılışta çeker
  fetchVenuesMap: async function () {
    var CACHE_KEY = 'eatgo_map_v1';
    var TTL = 30 * 60 * 1000; // 30 dakika

    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        var cached = JSON.parse(raw);
        if (Date.now() - cached.ts < TTL) {
          console.log('🗄️ Harita verisi cache\'den:', cached.data.length, 'mekan');
          return cached.data;
        }
      }
    } catch(e) {}

    console.log('📡 Harita verisi Supabase\'den çekiliyor...');
    var PAGE = 1000, all = [], offset = 0;
    while (true) {
      var resp = await fetch(
        window.SUPABASE_URL + '/rest/v1/venues?select=name,slug,category,lat,lng,rating,review_count&order=id.asc&limit=' + PAGE + '&offset=' + offset,
        { headers: this._headers() }
      );
      if (!resp.ok) break;
      var rows = await resp.json();
      all = all.concat(rows);
      if (rows.length < PAGE) break;
      offset += PAGE;
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: all }));
    } catch(e) {}

    console.log('✅ Harita verisi cache\'e kaydedildi:', all.length, 'mekan');
    return all;
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
