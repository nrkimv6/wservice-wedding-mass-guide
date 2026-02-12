<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Settings } from 'lucide-svelte';
	import { localStorageStore } from '$lib/stores/localStorageStore.svelte';
	import { massSteps, sections } from '$lib/data/massSteps';
	import { massStepsMerged, sectionsMerged } from '$lib/data/massStepsMerged';
	import { wakeLockStore } from '$lib/stores/wakeLock.svelte';
	import { realtimeSyncStore } from '$lib/stores/realtimeSync.svelte';
	import { getMass } from '$lib/services/massService';
	import { cacheMassData } from '$lib/utils/serviceWorker';
	import { trackMassVisit } from '$lib/services/analyticsService';
	import type { MassConfiguration } from '$lib/types/mass';
	import Header from '$lib/components/Header.svelte';
	import StepCard from '$lib/components/StepCard.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import IntroScreen, { type ViewMode } from '$lib/components/IntroScreen.svelte';
	import ThemeSelector, { type ThemeOption } from '$lib/components/ThemeSelector.svelte';
	import MassInfoPage from '$lib/components/MassInfoPage.svelte';
	import AnnouncementBanner from '$lib/components/AnnouncementBanner.svelte';
	import SyncStatusBanner from '$lib/components/SyncStatusBanner.svelte';
	import SwipeHint from '$lib/components/SwipeHint.svelte';

	// Mass configuration from database
	let massConfig = $state<MassConfiguration | null>(null);
	let loadingMass = $state(true);
	let massError = $state('');

	// Get massId from URL
	const massId = $page.params.massId || 'default';

	// Load mass configuration on mount
	onMount(async () => {
		const { data, error } = await getMass(massId);

		if (error) {
			massError = error.message;
		} else if (data) {
			massConfig = data;

			// Track analytics visit
			if (browser) {
				await trackMassVisit(massId);
			}

			// Cache mass data for offline use
			if (browser) {
				await cacheMassData(massId, data);
			}

			// Connect to realtime channel if sync is enabled
			if (data.sync_enabled && browser) {
				realtimeSyncStore.connect(massId);
				realtimeSyncStore.setSyncEnabled(true);

				// Listen for step changes from admin
				realtimeSyncStore.onStepChange((step) => {
					if (realtimeSyncStore.state.syncing && hasStartedStore.value) {
						currentStepIdStore.value = step;
					}
				});
			}
		}

		loadingMass = false;

		// Cleanup on unmount
		return () => {
			realtimeSyncStore.disconnect();
		};
	});

	// Persisted state (use massId prefix to isolate state per mass)
	const hasStartedStore = localStorageStore(`mass-${massId}-started`, false);
	const currentStepIdStore = localStorageStore(`mass-${massId}-current-step`, 1);
	const textSizeStore = localStorageStore(`mass-${massId}-text-size`, 3);
	const themeStore = localStorageStore<ThemeOption>(`mass-${massId}-theme`, 'ivory-gold');
	const viewModeStore = localStorageStore<ViewMode>(`mass-${massId}-view-mode`, 'detailed');
	const announcementDismissedStore = localStorageStore(`mass-${massId}-announcement-dismissed`, false);
	const swipeHintShownStore = localStorageStore(`mass-${massId}-swipe-hint-shown`, false);

	// UI state
	let showToc = $state(false);
	let showTheme = $state(false);
	let showInfo = $state(false);
	let swipeStart = $state<number | null>(null);

	// Show swipe hint when mass has started but hint not yet shown
	const showSwipeHint = $derived(hasStartedStore.value && !swipeHintShownStore.value);

	// Dismiss swipe hint
	function dismissSwipeHint() {
		swipeHintShownStore.value = true;
	}

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

	// Initialize theme and view mode from mass configuration on first load
	$effect(() => {
		if (massConfig && !hasStartedStore.value) {
			// Set theme from config if not already set
			if (massConfig.theme) {
				themeStore.value = massConfig.theme as ThemeOption;
			}
			// Set view mode from config if not already set
			if (massConfig.view_mode) {
				viewModeStore.value = massConfig.view_mode as ViewMode;
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

	// Scroll to top when step changes
	$effect(() => {
		// Track step changes
		const _currentStep = currentStepIdStore.value;
		if (browser && hasStartedStore.value) {
			window.scrollTo(0, 0);
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

	// Disable sync mode (for attendees)
	function disableSync() {
		realtimeSyncStore.setSyncEnabled(false);
	}

	// Get first announcement from mass configuration
	const announcement = $derived(
		massConfig?.announcements && massConfig.announcements.length > 0
			? massConfig.announcements.sort((a, b) => a.order - b.order)[0].message
			: ''
	);

	// Liturgical settings from mass configuration
	const liturgicalSettings = $derived({
		gloria: massConfig?.gloria_enabled ?? true,
		alleluia: massConfig?.alleluia_enabled ?? true
	});

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

{#if loadingMass}
	<div class="flex flex-col items-center justify-center min-h-screen bg-background theme-{themeStore.value}">
		<div class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
		<p class="mt-4 text-muted-foreground">미사 정보를 불러오는 중...</p>
	</div>
{:else if massError}
	<div class="flex flex-col items-center justify-center min-h-screen bg-background theme-{themeStore.value}">
		<div class="text-red-500 text-5xl mb-4">✗</div>
		<p class="text-red-600 mb-4">{massError}</p>
		<p class="text-muted-foreground">유효하지 않은 미사 링크입니다.</p>
	</div>
{:else if !hasStartedStore.value}
	<div class="theme-{themeStore.value}">
		<IntroScreen
			onStart={handleStart}
			viewMode={viewModeStore.value}
			onViewModeChange={handleViewModeChange}
			massInfo={massConfig ? {
				groomName: massConfig.groom_name,
				brideName: massConfig.bride_name,
				churchName: massConfig.church_name,
				date: massConfig.date,
				time: massConfig.time,
				celebrantName: massConfig.celebrant_name || undefined
			} : undefined}
		/>
	</div>
{:else}
	<div class="min-h-screen bg-background theme-{themeStore.value}" class:text-size-1={textSizeStore.value === 1} class:text-size-2={textSizeStore.value === 2} class:text-size-3={textSizeStore.value === 3} class:text-size-4={textSizeStore.value === 4} class:text-size-5={textSizeStore.value === 5}>
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

		<!-- Sync Status Banner (for realtime sync) -->
		<SyncStatusBanner
			connected={realtimeSyncStore.state.connected}
			syncing={realtimeSyncStore.state.syncing}
			error={realtimeSyncStore.state.error}
			onDisableSync={disableSync}
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

		<!-- Swipe Hint overlay -->
		<SwipeHint show={showSwipeHint} onDismiss={dismissSwipeHint} />

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
		{#if showInfo && massConfig}
			<MassInfoPage {massConfig} onClose={() => (showInfo = false)} />
		{/if}
	</div>
{/if}
