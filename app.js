// ========================================
// EATGO / MEKAN KEŞFET
// Ana JavaScript Dosyası
// ========================================

var userLat = null, userLng = null;

function haversineKm(a,b,c,d){var R=6371,dL=(c-a)*Math.PI/180,dG=(d-b)*Math.PI/180,x=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)*Math.sin(dG/2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function formatDist(km){return km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km';}

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
    'seafood':'🐟','italian':'🍝','vegan':'🥗','brunch':'🥐'
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
  if (venue.id) card.dataset.venueId = venue.id;
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
  var distLabel = (userLat !== null && vLat && vLng)
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
// FEED — GPS arka planda al (mesafe için), tüm mekanları göster
// ========================================

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    function(p) { userLat = p.coords.latitude; userLng = p.coords.longitude; },
    function() {},
    { timeout: 8000, maximumAge: 60000 }
  );
}

var _feedOffset = 0;
var _feedPageSize = 200;
var _feedLoading = false;
var _allLoaded = false;

function appendVenues(venues) {
  var grid = document.getElementById('venues-grid');
  if (!grid) return;
  venues.forEach(function(v) { var c = createVenueCard(v); if (c) grid.appendChild(c); });
}

var _scrollSentinel = null;

function setupInfiniteScroll() {
  if (_scrollSentinel) _scrollSentinel.remove();
  if (_allLoaded) return;
  var grid = document.getElementById('venues-grid');
  if (!grid) return;
  var sentinel = document.createElement('div');
  sentinel.id = 'scroll-sentinel';
  sentinel.style.cssText = 'height:1px;';
  grid.parentNode.insertBefore(sentinel, grid.nextSibling);
  _scrollSentinel = sentinel;
  var observer = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) loadMoreVenues();
  }, { rootMargin: '200px' });
  observer.observe(sentinel);
}

async function loadMoreVenues() {
  if (_feedLoading || _allLoaded) return;
  _feedLoading = true;
  try {
    var venues = await window.DB.fetchVenues(_feedOffset, _feedPageSize);
    if (venues.length < _feedPageSize) {
      _allLoaded = true;
      if (_scrollSentinel) _scrollSentinel.remove();
    }
    _feedOffset += venues.length;
    appendVenues(venues);
    if (!_allLoaded) setupInfiniteScroll();
  } catch(e) {}
  _feedLoading = false;
}

async function loadVenues() {
  var grid = document.getElementById('venues-grid');
  if (!grid) return;

  _feedOffset = 0;
  _allLoaded = false;
  grid.innerHTML = '<div class="loading">🔄 Mekanlar yükleniyor...</div>';

  try {
    var venues = [];

    if (window.DB && window.DB._ready()) {
      venues = await window.DB.fetchVenues(0, _feedPageSize);
      if (venues.length < _feedPageSize) _allLoaded = true;
      _feedOffset = venues.length;
    } else {
      var response = await fetch('./data/venues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var data = await response.json();
      venues = (data.venues && Array.isArray(data.venues)) ? data.venues : (Array.isArray(data) ? data : []);
      _allLoaded = true;
    }

    grid.innerHTML = '';
    appendVenues(venues);
    setupInfiniteScroll();

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
