<script lang="ts">
	import { Menu, Minus, Plus } from 'lucide-svelte';
	import type { MassStep } from '$lib/data/massSteps';

	interface Props {
		currentStep: MassStep;
		totalSteps: number;
		textSize: number;
		onMenuClick: () => void;
		onDecreaseSize: () => void;
		onIncreaseSize: () => void;
	}

	let { currentStep, totalSteps, textSize, onMenuClick, onDecreaseSize, onIncreaseSize }: Props =
		$props();
</script>

<header class="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
	<div class="flex items-center justify-between px-2 py-2 max-w-[600px] mx-auto">
		<!-- Menu button -->
		<button
			onclick={onMenuClick}
			class="p-3 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
			aria-label="목차 열기"
		>
			<Menu class="w-5 h-5" />
		</button>

		<!-- Current position display -->
		<div class="text-center flex-1 px-2">
			<p class="text-sm font-bold text-foreground truncate">
				{currentStep.id}/{totalSteps}
				{currentStep.title}
			</p>
			<p class="text-xs text-muted-foreground">
				{currentStep.section}
			</p>
		</div>

		<!-- Text size controls -->
		<div class="flex items-center gap-0.5">
			<button
				onclick={onDecreaseSize}
				disabled={textSize <= 1}
				class="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
				aria-label="글자 작게"
			>
				<Minus class="w-4 h-4" />
			</button>
			<span class="text-xs font-medium text-muted-foreground w-4 text-center">
				{textSize}
			</span>
			<button
				onclick={onIncreaseSize}
				disabled={textSize >= 5}
				class="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
				aria-label="글자 크게"
			>
				<Plus class="w-4 h-4" />
			</button>
		</div>
	</div>
</header>
