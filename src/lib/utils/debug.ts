import { dev } from '$app/environment';

export function debugLog(tag: string, ...args: unknown[]) {
	if (dev) {
		console.log(`[${tag}]`, ...args);
	}
}
