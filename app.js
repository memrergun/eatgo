// ========================================
// EATGO / MEKAN KEŞFET  
// Ana JavaScript Dosyası
// ========================================

console.log('🚀 app.js yüklendi');

// ========================================
// KATEGORİ EMOJİ HELPER
// ========================================

function getCategoryEmoji(category) {
  if (!category) return '🍽️';
  
  var cat = category.toLowerCase();
  
  var emojiMap = {
    'cafe': '☕',
    'coffee': '☕',
    'restaurant': '🍽️',
    'bar': '🍺',
    'fast food': '🍔',
    'burger': '🍔',
    'pizza': '🍕',
    'dessert': '🍰',
    'asian': '🍜',
    'turkish': '🥙',
    'breakfast': '🥐',
    'mediterranean': '🫒',
    'seafood': '🐟',
    'italian': '🍝',
    'vegan': '🥗',
    'brunch': '🥐'
  };
  
  for (var key in emojiMap) {
    if (cat.includes(key)) {
      return emojiMap[key];
    }
  }
  
  return '🍽️';
}

// ========================================
// MEKAN KARTI OLUŞTUR
// ========================================

function createVenueCard(venue) {
  if (!venue) {
    console.warn('⚠️ createVenueCard: venue boş');
    return null;
  }
  
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
  var featured = venue.featured || false;
  
  var imageUrl = venue.media?.coverImage || 
                 (venue.media?.gallery && venue.media.gallery[0]) || 
                 '';
  
  // URL: venue.html formatında, anchor (#) ile slug gönder
  var detailUrl = 'venue.html#' + encodeURIComponent(slug);
  
  var badge = featured ? '<div class="card-badge">⭐ Öne Çıkan</div>' : '';
  
  var cardHTML = '';
  cardHTML += '<div class="card-img" style="';
  
  if (imageUrl) {
    cardHTML += 'background-image:url(\'' + imageUrl + '\');background-size:cover;background-position:center;';
  } else {
    cardHTML += 'background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;align-items:center;justify-content:center;font-size:60px;';
  }
  
  cardHTML += '">';
  
  if (!imageUrl) {
    cardHTML += emoji;
  }
  
  cardHTML += badge;
  cardHTML += '<div class="card-distance">' + priceRange + '</div>';
  cardHTML += '</div>';
  
  cardHTML += '<div class="card-body">';
  cardHTML += '  <div class="card-name">' + name + '</div>';
  cardHTML += '  <div class="card-meta">' + neighborhood + ' · ' + category + '</div>';
  cardHTML += '  <div style="display:flex;justify-content:space-between;align-items:center;">';
  cardHTML += '    <div class="card-score">';
  cardHTML += '      <span>★</span> ' + rating.toFixed(1);
  cardHTML += '      <span style="color:var(--muted);font-weight:400;">(' + reviewCount + ')</span>';
  cardHTML += '    </div>';
  cardHTML += '    <div class="card-segments">';
  cardHTML += '      <span class="seg-pill">' + category + '</span>';
  cardHTML += '    </div>';
  cardHTML += '  </div>';
  cardHTML += '</div>';
  
  card.innerHTML = cardHTML;
  
  card.addEventListener('click', function() {
    console.log('🔗 Tıklanan mekan:', name);
    console.log('🔗 Slug:', slug);
    console.log('🔗 Yönlendirilecek URL:', detailUrl);
    window.location.href = detailUrl;
  });
  
  return card;
}

// ========================================
// MEKANLARI EKRANA BAS
// ========================================

function displayVenues(venues) {
  var grid = document.getElementById('venues-grid');
  
  if (!grid) {
    console.warn('⚠️ venues-grid elementi bulunamadı');
    return;
  }
  
  grid.innerHTML = '';
  
  if (!venues || venues.length === 0) {
    grid.innerHTML = '<div class="loading">Henüz mekan eklenmedi.</div>';
    console.warn('⚠️ Gösterilecek mekan yok');
    return;
  }
  
  console.log('📋 ' + venues.length + ' mekan ekleniyor...');
  
  var successCount = 0;
  
  venues.forEach(function(venue, index) {
    var card = createVenueCard(venue);
    
    if (card) {
      grid.appendChild(card);
      successCount++;
      
      if ((index + 1) % 5 === 0) {
        console.log('📌 ' + (index + 1) + '/' + venues.length + ' mekan eklendi');
      }
    } else {
      console.warn('⚠️ Kart oluşturulamadı:', venue.name || 'İsimsiz');
    }
  });
  
  console.log('✅ Toplam ' + successCount + ' mekan başarıyla eklendi');
}

// ========================================
// VENUES.JSON YÜKLEME
// ========================================

async function loadVenues() {
  var grid = document.getElementById('venues-grid');
  
  if (!grid) {
    console.warn('⚠️ venues-grid elementi bulunamadı');
    return;
  }
  
  grid.innerHTML = '<div class="loading">🔄 Mekanlar yükleniyor...</div>';
  
  try {
    console.log('📡 venues.json yükleniyor...');
    
    var response = await fetch('./data/venues.json');
    
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ': ' + response.statusText);
    }
    
    var data = await response.json();
    
    var venues = [];
    
    if (data.venues && Array.isArray(data.venues)) {
      venues = data.venues;
    } else if (Array.isArray(data)) {
      venues = data;
    } else {
      throw new Error('Geçersiz veri formatı');
    }
    
    console.log('✅ venues.json yüklendi');
    console.log('📦 Toplam mekan sayısı:', venues.length);
    
    if (venues.length > 0) {
      console.log('📍 İlk mekan:', venues[0].name);
      console.log('📍 İlk slug:', venues[0].slug);
    }
    
    displayVenues(venues);
    
    window.dispatchEvent(new CustomEvent('venuesLoaded', {
      detail: { venues: venues }
    }));
    
    console.log('🎉 Mekanlar başarıyla yüklendi');
    
  } catch (error) {
    console.error('❌ Veri yükleme hatası:', error);
    
    grid.innerHTML = '<div class="loading" style="color:#e74c3c;">' +
      '⚠️ Mekanlar yüklenemedi<br>' +
      '<small style="font-size:12px;opacity:0.7;">' + error.message + '</small><br>' +
      '<button onclick="window.location.reload()" ' +
      'style="margin-top:12px;padding:8px 16px;background:#1D9BF0;color:white;border:none;' +
      'border-radius:8px;cursor:pointer;font-family:DM Sans,sans-serif;font-size:13px;font-weight:600;">' +
      '🔄 Yeniden Dene' +
      '</button>' +
      '</div>';
  }
}

// ========================================
// GLOBAL FONKSİYONLAR
// ========================================

window.goToVenue = function(url) {
  console.log('🔗 Mekan detayına git:', url);
  window.location.href = url;
};

// ========================================
// SAYFA YÜKLENME
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🏁 DOM yüklendi');
  console.log('📍 Sayfa:', window.location.pathname);
  
  if (document.getElementById('venues-grid')) {
    console.log('📋 venues-grid bulundu, mekanlar yükleniyor...');
    loadVenues();
  } else {
    console.log('ℹ️ venues-grid yok');
  }
});

console.log('✅ app.js hazır');