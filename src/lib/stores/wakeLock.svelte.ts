import { browser } from '$app/environment';

/**
 * Wake Lock store to prevent screen from turning off during mass
 */
class WakeLockStore {
	private wakeLock: WakeLockSentinel | null = $state(null);
	public isSupported = $state(false);
	public isActive = $state(false);

	constructor() {
		if (browser) {
			this.isSupported = 'wakeLock' in navigator;
		}
	}

	async enable() {
		if (!this.isSupported || !browser) {
			console.warn('Wake Lock API is not supported');
			return;
		}

		try {
			this.wakeLock = await navigator.wakeLock.request('screen');
			this.isActive = true;

			// Re-acquire wake lock when page becomes visible again
			this.wakeLock.addEventListener('release', () => {
				this.isActive = false;
			});

			console.log('Wake Lock is active');
		} catch (err) {
			console.error('Failed to acquire wake lock:', err);
			this.isActive = false;
		}
	}

	async disable() {
		if (this.wakeLock) {
			await this.wakeLock.release();
			this.wakeLock = null;
			this.isActive = false;
			console.log('Wake Lock released');
		}
	}

	// Re-acquire wake lock when page becomes visible
	async reacquire() {
		if (this.isSupported && !this.isActive && document.visibilityState === 'visible') {
			await this.enable();
		}
	}
}

export const wakeLockStore = new WakeLockStore();
