// ========================================
// EATGO / MEKAN KEŞFET
// Ana JavaScript Dosyası
// ========================================

var userLat = null, userLng = null;

function haversineKm(a,b,c,d){var R=6371,dL=(c-a)*Math.PI/180,dG=(d-b)*Math.PI/180,x=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)*Math.sin(dG/2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function formatDist(km){return km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km';}

// ========================================
// GPS — 4 saniye timeout, sonra null döner
// ========================================

function getGPS() {
  return new Promise(function(resolve) {
    if (!navigator.geolocation) { resolve(null); return; }
    var t = setTimeout(function() { resolve(null); }, 4000);
    navigator.geolocation.getCurrentPosition(
      function(p) { clearTimeout(t); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      function() { clearTimeout(t); resolve(null); },
      { timeout: 4000, maximumAge: 60000 }
    );
  });
}

// ========================================
// KATEGORİ EMOJİ HELPER
// ========================================

function getCategoryEmoji(category) {
  if (!category) return '🍽️';
  var cat = category.toLowerCase();
  var emojiMap = {
    'cafe':'☕','coffee':'☕','restaurant':'🍽️','bar':'🍺',
    'fast food':'🍔','burger':'🍔','pizza':'🍕','dessert':'🍰',
    'asian':'🍜','turkish':'🥙','breakfast':'🥐','mediterranean':'🫒',
    'seafood':'🐟','italian':'🍝','vegan':'🥗','brunch':'🥐',
    'kafeterya':'☕','kahve':'☕','kahvaltı':'🥐','pastane':'🍰',
    'balık':'🐟','kebap':'🥙','restoran':'🍽️'
  };
  for (var key in emojiMap) { if (cat.includes(key)) return emojiMap[key]; }
  return '🍽️';
}

// ========================================
// MEKAN KARTI OLUŞTUR
// ========================================

function createVenueCard(venue) {
  if (!venue) return null;

  var card = document.createElement('div');
  card.className = 'venue-card';
  if (venue.slug) card.dataset.slug = venue.slug;

  var name = venue.name || 'İsimsiz Mekan';
  var slug = venue.slug || '';
  var category = venue.category || 'Restoran';
  var emoji = getCategoryEmoji(category);
  var rating = venue.rating?.overall ?? 4.0;
  var reviewCount = venue.rating?.reviewCount ?? 0;
  var neighborhood = venue.location?.neighborhood || venue.location?.city || 'İstanbul';
  var priceRange = venue.pricing?.range || '₺₺';
  var imageUrl = venue.media?.coverImage || (venue.media?.gallery && venue.media.gallery[0]) || '';
  var detailUrl = 'venue.html#' + encodeURIComponent(slug);
  var badge = venue.featured ? '<div class="card-badge">⭐ Öne Çıkan</div>' : '';

  var vLat = venue.location?.coordinates?.lat, vLng = venue.location?.coordinates?.lng;
  var hasCoords = vLat != null && vLng != null;
  var distLabel = (userLat !== null && hasCoords)
    ? formatDist(haversineKm(userLat, userLng, vLat, vLng))
    : priceRange;

  var cardHTML = '<div class="card-img" style="';
  if (imageUrl) {
    cardHTML += 'background-image:url(\'' + imageUrl + '\');background-size:cover;background-position:center;';
  } else {
    cardHTML += 'background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;align-items:center;justify-content:center;font-size:60px;';
  }
  cardHTML += '">';
  if (!imageUrl) cardHTML += emoji;
  cardHTML += badge;
  cardHTML += '<div class="card-distance">' + distLabel + '</div>';
  cardHTML += '</div>';
  cardHTML += '<div class="card-body">';
  cardHTML += '<div class="card-name">' + name + '</div>';
  cardHTML += '<div class="card-meta">' + neighborhood + ' · ' + category + '</div>';
  cardHTML += '<div style="display:flex;justify-content:space-between;align-items:center;">';
  cardHTML += '<div class="card-score"><span>★</span> ' + rating.toFixed(1);
  cardHTML += '<span style="color:var(--muted);font-weight:400;">(' + reviewCount + ')</span></div>';
  cardHTML += '<div class="card-segments"><span class="seg-pill">' + category + '</span></div>';
  cardHTML += '</div></div>';

  card.innerHTML = cardHTML;
  card.addEventListener('click', function() { window.location.href = detailUrl; });
  return card;
}

// ========================================
// FEED
// ========================================

var _feedOffset = 0;
var _feedPageSize = 200;
var _feedLoading = false;
var _allLoaded = false;

function appendVenues(venues) {
  var grid = document.getElementById('venues-grid');
  if (!grid) return;
  venues.forEach(function(v) { var c = createVenueCard(v); if (c) grid.appendChild(c); });
}

function setupInfiniteScroll() {
  var feedView = document.getElementById('feedView');
  if (!feedView || feedView._scrollBound) return;
  feedView._scrollBound = true;
  feedView.addEventListener('scroll', function() {
    if (_feedLoading || _allLoaded) return;
    if (feedView.scrollTop + feedView.clientHeight >= feedView.scrollHeight - 600) {
      loadMoreVenues();
    }
  });
}

async function loadMoreVenues() {
  if (_feedLoading || _allLoaded) return;
  _feedLoading = true;
  try {
    var venues = await window.DB.fetchVenues(_feedOffset, _feedPageSize);
    if (venues.length < _feedPageSize) _allLoaded = true;
    _feedOffset += venues.length;
    appendVenues(venues);
  } catch(e) {}
  _feedLoading = false;
}

async function loadVenues() {
  var grid = document.getElementById('venues-grid');
  if (!grid) return;

  _feedOffset = 0;
  _allLoaded = false;
  grid.innerHTML = '<div class="loading">📍 Konum alınıyor…</div>';

  try {
    var venues = [];

    if (window.DB && window.DB._ready()) {
      var gps = await getGPS();

      if (gps) {
        userLat = gps.lat;
        userLng = gps.lng;
        grid.innerHTML = '<div class="loading">🔄 Yakın mekanlar yükleniyor…</div>';
        var nearby = await window.DB.fetchVenuesNearby(gps.lat, gps.lng, 15);
        venues = nearby.filter(Boolean);
        venues.sort(function(a, b) {
          var aLat = a.location?.coordinates?.lat, aLng = a.location?.coordinates?.lng;
          var bLat = b.location?.coordinates?.lat, bLng = b.location?.coordinates?.lng;
          if (!aLat || !aLng) return 1;
          if (!bLat || !bLng) return -1;
          return haversineKm(gps.lat, gps.lng, aLat, aLng) - haversineKm(gps.lat, gps.lng, bLat, bLng);
        });
        _allLoaded = true;
      } else {
        grid.innerHTML = '<div class="loading">🔄 Mekanlar yükleniyor…</div>';
        venues = await window.DB.fetchVenues(0, _feedPageSize);
        if (venues.length < _feedPageSize) _allLoaded = true;
        _feedOffset = venues.length;
      }
    } else {
      var response = await fetch('./data/venues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var data = await response.json();
      venues = (data.venues && Array.isArray(data.venues)) ? data.venues : (Array.isArray(data) ? data : []);
      _allLoaded = true;
    }

    grid.innerHTML = '';
    appendVenues(venues);
    if (!_allLoaded) setupInfiniteScroll();
    window.dispatchEvent(new CustomEvent('venuesLoaded', { detail: { venues: venues } }));

  } catch (error) {
    console.error('❌ Veri yükleme hatası:', error);
    grid.innerHTML = '<div class="loading" style="color:#e74c3c;">' +
      '⚠️ Mekanlar yüklenemedi<br>' +
      '<small style="font-size:12px;opacity:0.7;">' + error.message + '</small><br>' +
      '<button onclick="window.location.reload()" ' +
      'style="margin-top:12px;padding:8px 16px;background:#1D9BF0;color:white;border:none;' +
      'border-radius:8px;cursor:pointer;font-family:DM Sans,sans-serif;font-size:13px;font-weight:600;">' +
      '🔄 Yeniden Dene</button></div>';
  }
}

// ========================================
// GLOBAL FONKSİYONLAR
// ========================================

window.goToVenue = function(url) { window.location.href = url; };

// ========================================
// SAYFA YÜKLENME
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('venues-grid')) {
    loadVenues();
  }
});
