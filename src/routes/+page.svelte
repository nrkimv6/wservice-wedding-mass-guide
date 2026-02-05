<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { Settings } from 'lucide-svelte';
	import { localStorageStore } from '$lib/stores/localStorageStore.svelte';
	import { massSteps, sections } from '$lib/data/massSteps';
	import { massStepsMerged, sectionsMerged } from '$lib/data/massStepsMerged';
	import { wakeLockStore } from '$lib/stores/wakeLock.svelte';
	import Header from '$lib/components/Header.svelte';
	import StepCard from '$lib/components/StepCard.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import IntroScreen, { type ViewMode } from '$lib/components/IntroScreen.svelte';
	import ThemeSelector, { type ThemeOption } from '$lib/components/ThemeSelector.svelte';
	import CommonInfoPage from '$lib/components/CommonInfoPage.svelte';
	import AnnouncementBanner from '$lib/components/AnnouncementBanner.svelte';

	// Persisted state
	const hasStartedStore = localStorageStore('mass-started', false);
	const currentStepIdStore = localStorageStore('mass-current-step', 1);
	const textSizeStore = localStorageStore('mass-text-size', 3);
	const themeStore = localStorageStore<ThemeOption>('mass-theme', 'ivory-gold');
	const viewModeStore = localStorageStore<ViewMode>('mass-view-mode', 'detailed');
	const announcementDismissedStore = localStorageStore('mass-announcement-dismissed', false);

	// UI state
	let showToc = $state(false);
	let showTheme = $state(false);
	let showInfo = $state(false);
	let swipeStart = $state<number | null>(null);

	// Get data based on view mode
	const currentMassSteps = $derived(viewModeStore.value === 'merged' ? massStepsMerged : massSteps);
	const currentSections = $derived(viewModeStore.value === 'merged' ? sectionsMerged : sections);

	// Get current step
	const currentStep = $derived(
		currentMassSteps.find((s) => s.id === currentStepIdStore.value) || currentMassSteps[0]
	);
	const totalSteps = $derived(currentMassSteps.length);

	// Handle direct step URL parameter
	$effect(() => {
		if (browser) {
			const stepParam = $page.url.searchParams.get('step');
			if (stepParam) {
				const stepId = parseInt(stepParam);
				if (!isNaN(stepId) && stepId >= 1) {
					// Check if step exists in filtered steps
					const stepExists = filteredMassSteps.some((s) => s.id === stepId);
					if (stepExists) {
						currentStepIdStore.value = stepId;
						hasStartedStore.value = true;
					}
				}
			}
		}
	});

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

	// Wake Lock: prevent screen from turning off during mass
	$effect(() => {
		if (browser && hasStartedStore.value) {
			// Enable wake lock when mass starts
			wakeLockStore.enable();

			// Re-acquire wake lock when page becomes visible
			const handleVisibilityChange = () => {
				if (document.visibilityState === 'visible') {
					wakeLockStore.reacquire();
				}
			};

			document.addEventListener('visibilitychange', handleVisibilityChange);

			// Cleanup: release wake lock when leaving
			return () => {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
				wakeLockStore.disable();
			};
		}
	});

	// Navigation handlers
	function goToPrevious() {
		const currentIndex = filteredMassSteps.findIndex((s) => s.id === currentStepIdStore.value);
		if (currentIndex > 0) {
			currentStepIdStore.value = filteredMassSteps[currentIndex - 1].id;
		}
	}

	function goToNext() {
		const currentIndex = filteredMassSteps.findIndex((s) => s.id === currentStepIdStore.value);
		if (currentIndex < filteredMassSteps.length - 1) {
			currentStepIdStore.value = filteredMassSteps[currentIndex + 1].id;
		}
	}

	function goToStep(stepId: number) {
		// Check if the step is in the filtered list
		const step = filteredMassSteps.find((s) => s.id === stepId);
		if (step) {
			currentStepIdStore.value = stepId;
		}
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

	// Handle view mode change
	function handleViewModeChange(mode: ViewMode) {
		viewModeStore.value = mode;
		// Reset step to 1 when view mode changes
		currentStepIdStore.value = 1;
	}

	// Handle start
	function handleStart() {
		hasStartedStore.value = true;
		currentStepIdStore.value = 1;
	}

	// Mock announcement - 추후 실제 데이터로 교체
	const announcement = '환영합니다! 혼배미사에 참례해 주셔서 감사합니다. 🙏';

	// Mock liturgical settings - 추후 실제 데이터로 교체
	// 'lent' (사순시기) = gloria: false, alleluia: false
	// 'advent' (대림시기) = gloria: false, alleluia: true
	// 'ordinary' (연중시기) = gloria: true, alleluia: true
	const liturgicalSettings = {
		gloria: true,
		alleluia: true
	};

	// Filter steps based on optional prayers
	const filteredMassSteps = $derived(
		currentMassSteps.filter((step) => {
			if (step.isOptional && step.optionalKey) {
				return liturgicalSettings[step.optionalKey];
			}
			return true;
		})
	);

	// Recalculate current step from filtered list
	const currentFilteredStep = $derived(
		filteredMassSteps.find((s) => s.id === currentStepIdStore.value) || filteredMassSteps[0]
	);
	const totalFilteredSteps = $derived(filteredMassSteps.length);
</script>

{#if !hasStartedStore.value}
	<IntroScreen
		onStart={handleStart}
		viewMode={viewModeStore.value}
		onViewModeChange={handleViewModeChange}
	/>
{:else}
	<div class="min-h-screen bg-background" class:text-size-1={textSizeStore.value === 1} class:text-size-2={textSizeStore.value === 2} class:text-size-3={textSizeStore.value === 3} class:text-size-4={textSizeStore.value === 4} class:text-size-5={textSizeStore.value === 5}>
		<!-- Header -->
		<Header
			currentStep={currentFilteredStep}
			totalSteps={totalFilteredSteps}
			textSize={textSizeStore.value}
			onMenuClick={() => (showToc = true)}
			onInfoClick={() => (showInfo = true)}
			onDecreaseSize={decreaseTextSize}
			onIncreaseSize={increaseTextSize}
		/>

		<!-- Announcement Banner -->
		{#if announcement && !announcementDismissedStore.value}
			<div class="max-w-[600px] mx-auto">
				<AnnouncementBanner
					{announcement}
					onDismiss={() => (announcementDismissedStore.value = true)}
				/>
			</div>
		{/if}

		<!-- Main content -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<main
			class="max-w-[600px] mx-auto p-4 pb-24"
			ontouchstart={handleTouchStart}
			ontouchend={handleTouchEnd}
		>
			<StepCard
				step={currentFilteredStep}
				totalSteps={totalFilteredSteps}
				onPrevious={goToPrevious}
				onNext={goToNext}
			/>

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
				sections={currentSections}
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

		<!-- Mass info page overlay -->
		{#if showInfo}
			<CommonInfoPage onClose={() => (showInfo = false)} />
		{/if}
	</div>
{/if}
