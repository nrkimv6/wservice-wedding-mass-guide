<script module lang="ts">
	export type ThemeOption = 'ivory-gold' | 'white-rose' | 'cathedral' | 'sage';
</script>

<script lang="ts">
	import { Check, Palette, X } from 'lucide-svelte';

	interface Props {
		currentTheme: ThemeOption;
		onSelectTheme: (theme: ThemeOption) => void;
		onClose: () => void;
	}

	let { currentTheme, onSelectTheme, onClose }: Props = $props();

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

		<div class="p-4 space-y-2">
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
	</div>
</div>
