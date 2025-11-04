const CACHE_NAME = 'video-snap-cache-v1';
// ஆஃப்லைனில் இயக்க தேவையான அனைத்து உள்ளூர் கோப்புகளும்.
const FILES_TO_CACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  './lib/jszip.min.js', // நீங்கள் பயன்படுத்தும் முக்கிய நூலகம்
  // Google Fonts (Runtime Caching-ஐ உறுதி செய்ய)
  'https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Montserrat:wght@400;700&display=swap'
];

// நிறுவல் நிகழ்வு (Install Event)
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching offline assets.');
        return cache.addAll(FILES_TO_CACHE).catch(error => {
            // சில வெளிப்புற URL-கள் தோல்வியடைந்தாலும், மீதமுள்ள ஆப் உள்ளூர் கோப்புகளை கேச் செய்ய இது அனுமதிக்கிறது.
            console.error('[Service Worker] Caching failed for some resources:', error);
        });
      })
  );
  self.skipWaiting(); // புதிய Service Worker உடனடியாக கட்டுப்பாட்டைப் பெற அனுமதிக்கிறது
});

// ஆக்டிவேட் நிகழ்வு (Activate Event) - பழைய கேஷ்களை நீக்குகிறது
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating and clearing old caches.');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (cacheWhitelist.indexOf(key) === -1) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch நிகழ்வு - கேச் செய்யப்பட்ட கோப்புகளை முதலில் வழங்குகிறது (Cache First Strategy)
self.addEventListener('fetch', (event) => {
  // GET கோரிக்கைகளை மட்டும் கையாளவும்
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // கேஷில் இருந்தால், அதைப் பயன்படுத்தவும்
        if (response) {
          return response;
        }
        
        // கேஷில் இல்லையெனில், நெட்வொர்க்கிலிருந்து Fetch செய்யவும்
        return fetch(event.request).then(
            (response) => {
                // Fetch வெற்றிகரமாக இருந்தால், அதை கேஷில் சேமிக்க முயற்சிக்கவும்
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                
                // Cache-ல் வைக்கவும் (இது முக்கியமாக Google Fonts போன்ற வளங்களுக்காக)
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                return response;
            }
        ).catch(error => {
            // ஆஃப்லைனில் இருந்தால், நெட்வொர்க் தோல்வியடையும்
            console.warn('[Service Worker] Fetch failed:', error);
            // ஆஃப்லைன் Fallback இங்கே தேவையில்லை, ஏனெனில் இது Cache First Strategy
        });
      })
  );
});