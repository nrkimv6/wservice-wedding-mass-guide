<script lang="ts">
	import { browser } from '$app/environment';
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
</script>

{@render children()}
