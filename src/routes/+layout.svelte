<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { registerServiceWorker } from '$lib/utils/serviceWorker';
	import '../app.css';

	let { children } = $props();

	// Register service worker on mount
	onMount(async () => {
		if (browser) {
			await registerServiceWorker();
		}
	});

	// Scroll to top on page navigation
	afterNavigate(() => {
		if (browser) {
			window.scrollTo(0, 0);
		}
	});
</script>

{@render children()}
