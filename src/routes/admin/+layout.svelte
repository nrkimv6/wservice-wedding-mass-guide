<script lang="ts">
	import { page } from '$app/stores';

	// Get the current child component
	let { children } = $props();

	// TODO: Add authentication guard here
	// For now, allow all access
</script>

<div class="admin-layout">
	{@render children()}
</div>

<style>
	.admin-layout {
		min-height: 100vh;
	}
</style>
