const axios = require('axios');
const fs = require('fs');

// API Key
const API_KEY = 'AIzaSyApsshzyL42u5DqGzi_80bMsdGDL1XnW3c';

// Mekan detaylarını çek
async function getPlaceDetails(placeId) {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
                place_id: placeId,
                fields: 'name,formatted_address,geometry,rating,user_ratings_total,reviews,photos,opening_hours,formatted_phone_number,website,price_level,types,url',
                key: API_KEY,
                language: 'tr'
            }
        });
        
        return response.data.result;
    } catch (error) {
        console.error(`Detay çekilemedi: ${placeId}`, error.message);
        return null;
    }
}

// Fotoğraf URL'lerini oluştur
function getPhotoUrls(photos, limit = 5) {
    if (!photos) return [];
    
    return photos.slice(0, limit).map(photo => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${photo.photo_reference}&key=${API_KEY}`
    );
}

// Yorumları formatla
function formatReviews(reviews) {
    if (!reviews) return [];
    
    return reviews.slice(0, 5).map(review => ({
        author: review.author_name,
        rating: review.rating,
        text: review.text,
        time: new Date(review.time * 1000).toLocaleDateString('tr-TR'),
        profilePhoto: review.profile_photo_url
    }));
}

// Çalışma saatlerini formatla
function formatHours(openingHours) {
    if (!openingHours || !openingHours.weekday_text) return null;
    
    const days = ['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar'];
    const hours = {};
    
    openingHours.weekday_text.forEach((text, index) => {
        const day = days[index];
        const time = text.split(': ')[1] || 'Kapalı';
        hours[day] = time;
    });
    
    return hours;
}

// Ana fonksiyon
async function fetchVenues() {
    console.log('🔍 Google Places\'ten detaylı mekan bilgileri çekiliyor...\n');
    
    try {
        // Kadıköy restoranları ara
        const searchResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
            params: {
                query: 'restaurants in Kadıköy Istanbul',
                key: API_KEY,
                language: 'tr'
            }
        });
        
        if (searchResponse.data.status !== 'OK') {
            console.error('❌ Arama hatası:', searchResponse.data.status);
            return;
        }
        
        const places = searchResponse.data.results.slice(0, 20);
        console.log(`📍 ${places.length} mekan bulundu, detayları çekiliyor...\n`);
        
        const venues = [];
        
        // Her mekan için detayları çek
        for (let i = 0; i < places.length; i++) {
            const place = places[i];
            console.log(`⏳ ${i + 1}/${places.length} - ${place.name} detayları çekiliyor...`);
            
            const details = await getPlaceDetails(place.place_id);
            
            if (!details) {
                console.log(`⚠️  Detay alınamadı, atlanıyor...`);
                continue;
            }
            
            // Venue objesi oluştur
            const venue = {
                id: place.place_id,
                name: details.name,
                slug: details.name.toLowerCase()
                    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
                    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
                    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
                
                category: details.types.includes('restaurant') ? 'Restoran' : 
                         details.types.includes('cafe') ? 'Kafe' : 'Restoran',
                
                location: {
                    address: details.formatted_address,
                    neighborhood: details.formatted_address.split(',')[1]?.trim() || 'Kadıköy',
                    city: 'İstanbul',
                    coordinates: {
                        lat: details.geometry.location.lat,
                        lng: details.geometry.location.lng
                    }
                },
                
                media: {
                    coverImage: getPhotoUrls(details.photos, 1)[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
                    gallery: getPhotoUrls(details.photos, 8)
                },
                
                rating: {
                    overall: details.rating || 0,
                    reviewCount: details.user_ratings_total || 0
                },
                
                pricing: {
                    range: '₺'.repeat(details.price_level || 2),
                    priceLevel: details.price_level || 2
                },
                
                reviews: formatReviews(details.reviews),
                
                hours: formatHours(details.opening_hours),
                openNow: details.opening_hours?.open_now || false,
                
                contact: {
                    phone: details.formatted_phone_number || null,
                    website: details.website || null,
                    googleMapsUrl: details.url || null
                },
                
                tags: details.types
                    .filter(t => !['point_of_interest', 'establishment', 'food'].includes(t))
                    .slice(0, 5).map(t => t.replace(/_/g, ' ')),
                
                featured: i < 3,
                verified: true,
                lastUpdated: new Date().toISOString()
            };
            
            venues.push(venue);
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('\n✅ Tüm detaylar çekildi!\n');
        
        // Kaydet
        const outputData = {
            meta: {
                totalVenues: venues.length,
                lastUpdated: new Date().toISOString(),
                source: 'Google Places API'
            },
            venues: venues
        };
        
        fs.writeFileSync(
            'data/venues.json',
            JSON.stringify(outputData, null, 2)
        );
        
        console.log(`📊 ${venues.length} mekan kaydedildi!`);
        console.log(`📁 Dosya: data/venues.json\n`);
        
        // Özet
        console.log('📈 ÖZET:');
        console.log(`   Toplam mekan: ${venues.length}`);
        console.log(`   Ortalama puan: ${(venues.reduce((sum, v) => sum + v.rating.overall, 0) / venues.length).toFixed(1)}`);
        console.log(`   Toplam fotoğraf: ${venues.reduce((sum, v) => sum + v.media.gallery.length, 0)}`);
        console.log(`   Toplam yorum: ${venues.reduce((sum, v) => sum + v.reviews.length, 0)}\n`);
        
        // İlk 3 mekan
        console.log('🏆 İLK 3 MEKAN:\n');
        venues.slice(0, 3).forEach((v, i) => {
            console.log(`${i + 1}. ${v.name}`);
            console.log(`   ⭐ ${v.rating.overall} (${v.rating.reviewCount} yorum)`);
            console.log(`   📍 ${v.location.neighborhood}`);
            console.log(`   📸 ${v.media.gallery.length} fotoğraf`);
            console.log(`   💬 ${v.reviews.length} detaylı yorum\n`);
        });
        
    } catch (error) {
        console.error('❌ Hata:', error.message);
        if (error.response) {
            console.error('API Cevabı:', error.response.data);
        }
    }
}

fetchVenues();