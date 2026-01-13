<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import GoogleLoginButton from '$lib/components/GoogleLoginButton.svelte';
	import KakaoLoginButton from '$lib/components/KakaoLoginButton.svelte';
	import { authStore } from '$lib/stores/auth.svelte';

	onMount(async () => {
		// 인증 상태 초기화
		if (!authStore.initialized) {
			await authStore.initialize();
		}

		// 이미 로그인되어 있으면 대시보드로 리다이렉트
		if (authStore.isLoggedIn) {
			goto('/admin/dashboard');
		}
	});
</script>

<svelte:head>
	<title>관리자 로그인 - 혼배미사</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-foreground mb-2">관리자 로그인</h1>
			<p class="text-muted-foreground">혼배미사 순서지 관리</p>
		</div>

		<div class="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
			<GoogleLoginButton />
			<KakaoLoginButton />

			<div class="mt-6 pt-6 border-t border-border">
				<p class="text-sm text-muted-foreground text-center">
					💡 Google 또는 Kakao 계정으로 로그인하세요
				</p>
			</div>
		</div>

		<div class="mt-6 text-center">
			<a href="/" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
				← 순서지 보기로 돌아가기
			</a>
		</div>
	</div>
</div>
