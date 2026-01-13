<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowRight } from 'lucide-svelte';

	let password = $state('');

	function handleLogin(e: Event) {
		e.preventDefault();
		// TODO: Implement actual authentication
		// For now, just redirect to dashboard
		goto('/admin/dashboard');
	}
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

		<div class="bg-card border border-border rounded-lg p-6 shadow-sm">
			<form onsubmit={handleLogin}>
				<div class="mb-4">
					<label for="password" class="block text-sm font-medium mb-2">비밀번호</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						class="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
						placeholder="관리자 비밀번호 입력"
						required
					/>
				</div>

				<button
					type="submit"
					class="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
				>
					로그인
					<ArrowRight class="w-5 h-5" />
				</button>
			</form>

			<div class="mt-6 pt-6 border-t border-border">
				<p class="text-sm text-muted-foreground text-center">
					💡 개발 중: 임시로 비밀번호 없이 접근 가능합니다
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
