<script lang="ts">
	import { Menu, Minus, Plus, Info } from 'lucide-svelte';
	import type { MassStep } from '$lib/data/massSteps';
	import ProgressBar from './ProgressBar.svelte';

	interface Props {
		currentStep: MassStep;
		totalSteps: number;
		textSize: number;
		onMenuClick: () => void;
		onInfoClick: () => void;
		onDecreaseSize: () => void;
		onIncreaseSize: () => void;
	}

	let {
		currentStep,
		totalSteps,
		textSize,
		onMenuClick,
		onInfoClick,
		onDecreaseSize,
		onIncreaseSize
	}: Props = $props();
</script>

<header class="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
	<div class="max-w-[600px] mx-auto">
		<!-- Top row: Menu, Title, Info, Text size controls -->
		<div class="flex items-center justify-between px-2 py-2">
			<!-- Left: Menu button -->
			<button
				onclick={onMenuClick}
				class="p-2 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
				aria-label="목차 열기"
			>
				<Menu class="w-5 h-5" />
			</button>

			<!-- Center: Info button and Title -->
			<div class="flex items-center gap-2 flex-1 px-2">
				<button
					onclick={onInfoClick}
					class="p-2 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
					aria-label="미사 정보"
				>
					<Info class="w-5 h-5" />
				</button>

				<div class="text-center flex-1">
					<p class="text-sm font-bold text-foreground truncate">
						{currentStep.title}
					</p>
				</div>
			</div>

			<!-- Right: Text size controls -->
			<div class="flex items-center gap-0.5 shrink-0">
				<button
					onclick={onDecreaseSize}
					disabled={textSize <= 1}
					class="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
					aria-label="글자 작게"
				>
					<Minus class="w-4 h-4" />
				</button>
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

		<!-- Bottom row: Progress bar -->
		<div class="px-4 pb-2">
			<ProgressBar currentStep={currentStep.id} {totalSteps} />
		</div>
	</div>
</header>
