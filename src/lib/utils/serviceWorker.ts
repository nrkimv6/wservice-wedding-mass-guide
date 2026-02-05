/**
 * Service Worker registration and management utilities
 */

import { debugLog } from './debug';

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!('serviceWorker' in navigator)) {
		debugLog('SW', 'Service Worker not supported');
		return null;
	}

	try {
		const registration = await navigator.serviceWorker.register('/sw.js');
		debugLog('SW', 'Service Worker registered:', registration);

		// Handle updates
		registration.addEventListener('updatefound', () => {
			const newWorker = registration.installing;
			if (!newWorker) return;

			newWorker.addEventListener('statechange', () => {
				if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
					// New service worker available
					debugLog('SW', 'New version available');
				}
			});
		});

		return registration;
	} catch (error) {
		console.error('[SW] Service Worker registration failed:', error);
		return null;
	}
}

export async function unregisterServiceWorker(): Promise<boolean> {
	if (!('serviceWorker' in navigator)) {
		return false;
	}

	try {
		const registration = await navigator.serviceWorker.getRegistration();
		if (registration) {
			await registration.unregister();
			debugLog('SW', 'Service Worker unregistered');
			return true;
		}
		return false;
	} catch (error) {
		console.error('[SW] Service Worker unregister failed:', error);
		return false;
	}
}

export async function cacheMassData(massId: string, massData: any): Promise<void> {
	if (!('serviceWorker' in navigator)) {
		return;
	}

	try {
		const registration = await navigator.serviceWorker.ready;
		if (registration.active) {
			registration.active.postMessage({
				type: 'CACHE_MASS_DATA',
				massId,
				massData
			});
			debugLog('SW', 'Mass data cache request sent:', massId);
		}
	} catch (error) {
		console.error('[SW] Failed to cache mass data:', error);
	}
}

export async function clearAllCaches(): Promise<void> {
	if (!('caches' in window)) {
		return;
	}

	try {
		const cacheNames = await caches.keys();
		await Promise.all(cacheNames.map((name) => caches.delete(name)));
		debugLog('SW', 'All caches cleared');
	} catch (error) {
		console.error('[SW] Failed to clear caches:', error);
	}
}
