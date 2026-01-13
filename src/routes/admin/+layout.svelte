<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth.svelte';

	// Get the current child component
	let { children } = $props();

	let checking = $state(true);

	onMount(async () => {
		// 인증 상태 초기화
		if (!authStore.initialized) {
			await authStore.initialize();
		}

		// 로그인 페이지는 인증 체크 제외
		const isLoginPage = $page.url.pathname === '/admin' || $page.url.pathname === '/admin/';

		if (!isLoginPage && !authStore.isLoggedIn) {
			goto(`/admin?returnTo=${encodeURIComponent($page.url.pathname)}`);
			return;
		}

		checking = false;
	});
</script>

{#if checking && $page.url.pathname !== '/admin' && $page.url.pathname !== '/admin/'}
	<div class="flex items-center justify-center min-h-screen">
		<div class="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
	</div>
{:else}
	<div class="admin-layout">
		{@render children()}
	</div>
{/if}

<style>
	.admin-layout {
		min-height: 100vh;
	}
</style>
