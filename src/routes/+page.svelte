<script lang="ts">
	import { browser } from '$app/environment';
	import { Settings } from 'lucide-svelte';
	import { localStorageStore } from '$lib/stores/localStorageStore.svelte';
	import { massSteps } from '$lib/data/massSteps';
	import Header from '$lib/components/Header.svelte';
	import StepCard from '$lib/components/StepCard.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import IntroScreen from '$lib/components/IntroScreen.svelte';
	import ThemeSelector, { type ThemeOption } from '$lib/components/ThemeSelector.svelte';

	// Persisted state
	const hasStartedStore = localStorageStore('mass-started', false);
	const currentStepIdStore = localStorageStore('mass-current-step', 1);
	const textSizeStore = localStorageStore('mass-text-size', 3);
	const themeStore = localStorageStore<ThemeOption>('mass-theme', 'ivory-gold');

	// UI state
	let showToc = $state(false);
	let showTheme = $state(false);
	let swipeStart = $state<number | null>(null);

	// Get current step
	const currentStep = $derived(massSteps.find((s) => s.id === currentStepIdStore.value) || massSteps[0]);
	const totalSteps = massSteps.length;

	// Apply theme class to body
	$effect(() => {
		if (browser) {
			const body = document.body;
			body.classList.remove('theme-white-rose', 'theme-cathedral', 'theme-sage');
			if (themeStore.value !== 'ivory-gold') {
				body.classList.add(`theme-${themeStore.value}`);
			}
		}
	});

	// Apply text size class to main content
	$effect(() => {
		if (browser) {
			document.documentElement.style.setProperty(
				'--base-font-size',
				`${12 + textSizeStore.value * 2}px`
			);
		}
	});

	// Navigation handlers
	function goToPrevious() {
		if (currentStepIdStore.value > 1) {
			currentStepIdStore.value = currentStepIdStore.value - 1;
		}
	}

	function goToNext() {
		if (currentStepIdStore.value < totalSteps) {
			currentStepIdStore.value = currentStepIdStore.value + 1;
		}
	}

	function goToStep(stepId: number) {
		currentStepIdStore.value = Math.max(1, Math.min(stepId, totalSteps));
	}

	// Keyboard navigation
	$effect(() => {
		if (browser) {
			function handleKeyDown(e: KeyboardEvent) {
				if (e.key === 'ArrowLeft') {
					goToPrevious();
				} else if (e.key === 'ArrowRight') {
					goToNext();
				}
			}

			window.addEventListener('keydown', handleKeyDown);
			return () => window.removeEventListener('keydown', handleKeyDown);
		}
	});

	// Touch swipe handlers
	function handleTouchStart(e: TouchEvent) {
		swipeStart = e.touches[0].clientX;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (swipeStart === null) return;

		const swipeEnd = e.changedTouches[0].clientX;
		const diff = swipeStart - swipeEnd;
		const threshold = 50;

		if (Math.abs(diff) > threshold) {
			if (diff > 0) {
				goToNext();
			} else {
				goToPrevious();
			}
		}

		swipeStart = null;
	}

	// Text size handlers
	function decreaseTextSize() {
		if (textSizeStore.value > 1) textSizeStore.value = textSizeStore.value - 1;
	}

	function increaseTextSize() {
		if (textSizeStore.value < 5) textSizeStore.value = textSizeStore.value + 1;
	}

	// Handle start
	function handleStart() {
		hasStartedStore.value = true;
		currentStepIdStore.value = 1;
	}
</script>

{#if !hasStartedStore.value}
	<IntroScreen
		onStart={handleStart}
		onOpenTheme={() => (showTheme = true)}
		currentTheme={themeStore.value}
	/>
	{#if showTheme}
		<ThemeSelector
			currentTheme={themeStore.value}
			onSelectTheme={(theme) => (themeStore.value = theme)}
			onClose={() => (showTheme = false)}
		/>
	{/if}
{:else}
	<div class="min-h-screen bg-background text-size-{textSizeStore.value}">
		<!-- Header -->
		<Header
			currentStep={currentStep}
			totalSteps={totalSteps}
			textSize={textSizeStore.value}
			onMenuClick={() => (showToc = true)}
			onDecreaseSize={decreaseTextSize}
			onIncreaseSize={increaseTextSize}
		/>

		<!-- Main content -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<main
			class="max-w-[600px] mx-auto p-4 pb-24"
			ontouchstart={handleTouchStart}
			ontouchend={handleTouchEnd}
		>
			<StepCard step={currentStep} totalSteps={totalSteps} onPrevious={goToPrevious} onNext={goToNext} />

			<!-- Settings button (theme) -->
			<div class="fixed bottom-6 right-6">
				<button
					onclick={() => (showTheme = true)}
					class="p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:opacity-90 transition-opacity min-w-[56px] min-h-[56px] flex items-center justify-center"
					aria-label="테마 설정"
				>
					<Settings class="w-6 h-6" />
				</button>
			</div>
		</main>

		<!-- Table of Contents overlay -->
		{#if showToc}
			<TableOfContents
				currentStep={currentStepIdStore.value}
				onSelectSection={goToStep}
				onClose={() => (showToc = false)}
			/>
		{/if}

		<!-- Theme selector overlay -->
		{#if showTheme}
			<ThemeSelector
				currentTheme={themeStore.value}
				onSelectTheme={(theme) => (themeStore.value = theme)}
				onClose={() => (showTheme = false)}
			/>
		{/if}
	</div>
{/if}
