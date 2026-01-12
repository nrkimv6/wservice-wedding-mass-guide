<script module lang="ts">
	export type ThemeOption = 'ivory-gold' | 'white-rose' | 'cathedral' | 'sage';
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import { Check, Palette, X, RefreshCw } from 'lucide-svelte';

	interface Props {
		currentTheme: ThemeOption;
		onSelectTheme: (theme: ThemeOption) => void;
		onClose: () => void;
	}

	let { currentTheme, onSelectTheme, onClose }: Props = $props();

	let isClearing = $state(false);

	async function handleCacheClear() {
		if (!browser) return;

		if (!confirm('캐시를 초기화하고 최신 버전으로 업데이트하시겠습니까?\n저장된 데이터는 유지됩니다.')) {
			return;
		}

		isClearing = true;

		try {
			// 1. Service Worker 캐시만 삭제 (IndexedDB/localStorage는 유지)
			if ('caches' in window) {
				const cacheNames = await caches.keys();
				await Promise.all(cacheNames.map(name => caches.delete(name)));
			}

			// 2. Service Worker 업데이트 및 강제 활성화
			if ('serviceWorker' in navigator) {
				const registration = await navigator.serviceWorker.getRegistration();
				if (registration) {
					await registration.update();

					// 대기 중인 서비스 워커가 있으면 강제 활성화
					const waitingSW = registration.waiting;
					if (waitingSW) {
						waitingSW.postMessage({ type: 'SKIP_WAITING' });
						// 새 서비스 워커 활성화 대기
						await new Promise<void>((resolve) => {
							waitingSW.addEventListener('statechange', () => {
								if (waitingSW.state === 'activated') {
									resolve();
								}
							});
							// 타임아웃 (최대 3초)
							setTimeout(resolve, 3000);
						});
					}
				}
			}

			alert('캐시가 초기화되었습니다. 앱을 다시 시작합니다.');
			window.location.reload();
		} catch (error) {
			console.error('캐시 초기화 실패:', error);
			alert('캐시 초기화 중 오류가 발생했습니다. 다시 시도해주세요.');
			isClearing = false;
		}
	}

	const themes: { id: ThemeOption; name: string; description: string; colors: string[] }[] = [
		{
			id: 'ivory-gold',
			name: 'Ivory Gold',
			description: '클래식한 웨딩 느낌',
			colors: ['#FFFEF7', '#B8966E', '#8B1538']
		},
		{
			id: 'white-rose',
			name: 'White Rose',
			description: '로맨틱한 화이트 톤',
			colors: ['#FFFFFF', '#B76E79', '#D4A5A5']
		},
		{
			id: 'cathedral',
			name: 'Cathedral Classic',
			description: '전통 가톨릭 색상',
			colors: ['#FBF9F3', '#8B0000', '#CFB53B']
		},
		{
			id: 'sage',
			name: 'Natural Sage',
			description: '눈이 편안한 그린 톤',
			colors: ['#FAFAF8', '#7D9471', '#C4A962']
		}
	];
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 bg-foreground/30 z-50 flex items-end sm:items-center justify-center"
	onclick={onClose}
>
	<div
		class="w-full max-w-md bg-popover rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex items-center justify-between p-4 border-b border-border">
			<div class="flex items-center gap-2">
				<Palette class="w-5 h-5 text-primary" />
				<h3 class="font-bold text-lg text-foreground">테마 선택</h3>
			</div>
			<button
				onclick={onClose}
				class="p-2 rounded-full hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
				aria-label="닫기"
			>
				<X class="w-5 h-5" />
			</button>
		</div>

		<div class="p-4 space-y-4">
			<!-- Theme selection -->
			<div class="space-y-2">
				{#each themes as theme}
					{@const isActive = theme.id === currentTheme}
					<button
						onclick={() => {
							onSelectTheme(theme.id);
							onClose();
						}}
						class="w-full p-4 rounded-lg border-2 transition-all min-h-[44px] {isActive
							? 'border-primary bg-primary/5'
							: 'border-transparent hover:bg-muted'}"
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="flex -space-x-1">
									{#each theme.colors as color}
										<div
											class="w-6 h-6 rounded-full border-2 border-popover"
											style="background-color: {color}"
										></div>
									{/each}
								</div>
								<div class="text-left">
									<p class="font-medium text-foreground">{theme.name}</p>
									<p class="text-sm text-muted-foreground">{theme.description}</p>
								</div>
							</div>
							{#if isActive}
								<Check class="w-5 h-5 text-primary shrink-0" />
							{/if}
						</div>
					</button>
				{/each}
			</div>

			<!-- Cache clear section -->
			<div class="pt-4 border-t border-border">
				<button
					onclick={handleCacheClear}
					disabled={isClearing}
					class="w-full p-4 rounded-lg border-2 border-transparent hover:bg-muted transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<RefreshCw class="w-5 h-5 text-primary {isClearing ? 'animate-spin' : ''}" />
						</div>
						<div class="text-left flex-1">
							<p class="font-medium text-foreground">캐시 초기화</p>
							<p class="text-sm text-muted-foreground">최신 버전으로 업데이트 (데이터 유지)</p>
						</div>
					</div>
				</button>
			</div>
		</div>
	</div>
</div>
