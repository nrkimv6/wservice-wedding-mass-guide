/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

// Install event - cache all static assets
self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

// Activate event - delete old caches
self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// Try to serve from cache first
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);
			if (response) return response;
		}

		// Try network request
		try {
			const response = await fetch(event.request);

			// Cache successful responses
			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch {
			// Network failed, try cache
			const response = await cache.match(event.request);
			if (response) return response;

			throw new Error('Network request failed and no cache available');
		}
	}

	event.respondWith(respond());
});

// Handle messages from clients (for cache clearing and SKIP_WAITING)
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}

	if (event.data && event.data.type === 'CACHE_MASS_DATA') {
		const { massId, massData } = event.data;
		caches.open(CACHE).then((cache) => {
			const response = new Response(JSON.stringify(massData), {
				headers: { 'Content-Type': 'application/json' }
			});
			cache.put(`/api/mass/${massId}`, response);
		});
	}
});
