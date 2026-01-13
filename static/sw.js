// Service Worker for wedding-mass-guide PWA
const CACHE_NAME = 'wedding-mass-v1';
const ASSETS_TO_CACHE = [
	'/',
	'/manifest.json',
	'/_app/immutable/entry/start.js',
	'/_app/immutable/entry/app.js'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
	console.log('[SW] Installing service worker...');
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			console.log('[SW] Caching app shell');
			return cache.addAll(ASSETS_TO_CACHE);
		})
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	console.log('[SW] Activating service worker...');
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						console.log('[SW] Deleting old cache:', cacheName);
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
	self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
	// Skip cross-origin requests
	if (!event.request.url.startsWith(self.location.origin)) {
		return;
	}

	// Skip Supabase API requests (always fetch fresh)
	if (event.request.url.includes('supabase.co')) {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			if (cachedResponse) {
				// Return cached response if available
				return cachedResponse;
			}

			// Clone the request because it can only be used once
			const fetchRequest = event.request.clone();

			return fetch(fetchRequest).then((response) => {
				// Check if valid response
				if (!response || response.status !== 200 || response.type !== 'basic') {
					return response;
				}

				// Clone the response because it can only be used once
				const responseToCache = response.clone();

				caches.open(CACHE_NAME).then((cache) => {
					// Cache static assets (JS, CSS, images)
					if (
						event.request.url.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2)$/)
					) {
						cache.put(event.request, responseToCache);
					}
				});

				return response;
			});
		})
	);
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}

	if (event.data && event.data.type === 'CACHE_MASS_DATA') {
		// Cache mass-specific data
		const { massId, massData } = event.data;
		console.log('[SW] Caching mass data:', massId);

		caches.open(CACHE_NAME).then((cache) => {
			// Store mass data as JSON
			const response = new Response(JSON.stringify(massData), {
				headers: { 'Content-Type': 'application/json' }
			});
			cache.put(`/api/mass/${massId}`, response);
		});
	}
});
