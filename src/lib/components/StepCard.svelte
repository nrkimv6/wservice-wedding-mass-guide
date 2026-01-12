<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { MassStep } from '$lib/data/massSteps';
	import PostureBadge from './PostureBadge.svelte';
	import RoleBadge from './RoleBadge.svelte';
	import PrayerBox from './PrayerBox.svelte';
	import HymnBox from './HymnBox.svelte';

	interface Props {
		step: MassStep;
		totalSteps: number;
		onPrevious: () => void;
		onNext: () => void;
	}

	let { step, totalSteps, onPrevious, onNext }: Props = $props();

	const canGoPrevious = $derived(step.id > 1);
	const canGoNext = $derived(step.id < totalSteps);
</script>

<div class="bg-card rounded-xl shadow-sm border border-border p-5">
	<!-- Step header -->
	<div class="flex items-start justify-between gap-3 mb-4">
		<div>
			<p class="text-sm text-muted-foreground mb-1">
				{step.section} · {step.sectionEn}
			</p>
			<h2 class="text-xl font-bold text-foreground">
				{step.id}. {step.title}
			</h2>
		</div>
		<div class="text-right shrink-0">
			<span class="text-sm font-medium text-primary">
				{step.id}/{totalSteps}
			</span>
		</div>
	</div>

	<!-- Badges -->
	<div class="flex flex-wrap gap-2 mb-4">
		<PostureBadge posture={step.posture} />
		<RoleBadge role={step.role} />
	</div>

	<!-- Description -->
	<p class="text-foreground leading-relaxed mb-4 whitespace-pre-line">
		{step.description}
	</p>

	<!-- Prayer box -->
	{#if step.prayers && step.prayers.length > 0}
		<div class="mb-4">
			<PrayerBox prayers={step.prayers} />
		</div>
	{/if}

	<!-- Hymn box -->
	{#if step.hymn}
		<div class="mb-4">
			<HymnBox hymn={step.hymn} />
		</div>
	{/if}

	<!-- Navigation buttons -->
	<div class="flex items-center justify-between gap-4 pt-4 border-t border-border mt-4">
		<button
			onclick={onPrevious}
			disabled={!canGoPrevious}
			class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[48px] font-medium"
			aria-label="이전 단계"
		>
			<ChevronLeft class="w-5 h-5" />
			<span>이전</span>
		</button>

		<button
			onclick={onNext}
			disabled={!canGoNext}
			class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed min-h-[48px] font-medium"
			aria-label="다음 단계"
		>
			<span>다음</span>
			<ChevronRight class="w-5 h-5" />
		</button>
	</div>
</div>
