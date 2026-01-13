<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { ArrowLeft, Settings } from 'lucide-svelte';
	import { localStorageStore } from '$lib/stores/localStorageStore.svelte';
	import { massSteps, sections } from '$lib/data/massSteps';
	import { massStepsMerged, sectionsMerged } from '$lib/data/massStepsMerged';
	import { wakeLockStore } from '$lib/stores/wakeLock.svelte';
	import { realtimeSyncStore } from '$lib/stores/realtimeSync.svelte';
	import { getMass } from '$lib/services/massService';
	import type { MassConfiguration } from '$lib/types/mass';
	import Header from '$lib/components/Header.svelte';
	import StepCard from '$lib/components/StepCard.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import ThemeSelector, { type ThemeOption } from '$lib/components/ThemeSelector.svelte';
	import MassInfoPage from '$lib/components/MassInfoPage.svelte';
	import SyncControl from '$lib/components/SyncControl.svelte';

	// Mass configuration from database
	let massConfig = $state<MassConfiguration | null>(null);
	let loadingMass = $state(true);
	let massError = $state('');

	// Get massId from URL
	const massId = $page.params.massId || 'default';

	// Admin sync state
	let syncEnabled = $state(false);

	// Load mass configuration on mount
	onMount(async () => {
		const { data, error } = await getMass(massId);

		if (error) {
			massError = error.message;
		} else if (data) {
			massConfig = data;
		}

		loadingMass = false;

		// Connect to realtime channel
		if (browser) {
			realtimeSyncStore.connect(massId);
		}
	});

	onDestroy(() => {
		realtimeSyncStore.disconnect();
		wakeLockStore.release();
	});

	// Persisted state (use admin-massId prefix for admin view)
	const hasStartedStore = localStorageStore(`admin-mass-${massId}-started`, true); // Admin always started
	const currentStepIdStore = localStorageStore(`admin-mass-${massId}-current-step`, 1);
	const textSizeStore = localStorageStore(`admin-mass-${massId}-text-size`, 3);
	const themeStore = localStorageStore<ThemeOption>(`admin-mass-${massId}-theme`, 'ivory-gold');
	const viewModeStore = localStorageStore(`admin-mass-${massId}-view-mode`, 'detailed');

	// UI state
	let showToc = $state(false);
	let showTheme = $state(false);
	let showInfo = $state(false);
	let swipeStart = $state<number | null>(null);

	// Get data based on view mode
	const currentMassSteps = $derived(viewModeStore.value === 'merged' ? massStepsMerged : massSteps);
	const currentSections = $derived(viewModeStore.value === 'merged' ? sectionsMerged : sections);

	// Filter steps based on optional prayers
	const filteredMassSteps = $derived(
		massConfig
			? currentMassSteps.filter((step) => {
					if (step.isOptional) {
						if (step.optionalKey === 'gloria') return massConfig.gloria_enabled;
						if (step.optionalKey === 'alleluia') return massConfig.alleluia_enabled;
					}
					return true;
				})
			: currentMassSteps
	);

	// Get current step
	const currentStep = $derived(
		filteredMassSteps.find((s) => s.id === currentStepIdStore.value) || filteredMassSteps[0]
	);
	const totalSteps = $derived(filteredMassSteps.length);

	// Apply theme from config on load
	$effect(() => {
		if (massConfig && browser) {
			themeStore.value = massConfig.theme as ThemeOption;
			viewModeStore.value = massConfig.view_mode === 'merged' ? 'merged' : 'detailed';
		}
	});

	// Acquire wake lock when started
	$effect(() => {
		if (browser && hasStartedStore.value) {
			wakeLockStore.acquire();
		}
	});

	// Broadcast step changes when admin navigates
	$effect(() => {
		if (browser && syncEnabled && currentStepIdStore.value) {
			console.log('[Admin] Broadcasting step:', currentStepIdStore.value);
			realtimeSyncStore.broadcastStep(currentStepIdStore.value);
		}
	});

	// Keyboard navigation
	$effect(() => {
		if (browser && hasStartedStore.value) {
			const handleKeydown = (e: KeyboardEvent) => {
				if (e.key === 'ArrowLeft') handlePrev();
				if (e.key === 'ArrowRight') handleNext();
			};

			window.addEventListener('keydown', handleKeydown);
			return () => window.removeEventListener('keydown', handleKeydown);
		}
	});

	function handlePrev() {
		const currentIndex = filteredMassSteps.findIndex((s) => s.id === currentStepIdStore.value);
		if (currentIndex > 0) {
			currentStepIdStore.value = filteredMassSteps[currentIndex - 1].id;
		}
	}

	function handleNext() {
		const currentIndex = filteredMassSteps.findIndex((s) => s.id === currentStepIdStore.value);
		if (currentIndex < filteredMassSteps.length - 1) {
			currentStepIdStore.value = filteredMassSteps[currentIndex + 1].id;
		}
	}

	function handleTocSelect(stepId: number) {
		currentStepIdStore.value = stepId;
		showToc = false;
	}

	function handleTextSizeChange(delta: number) {
		const newSize = textSizeStore.value + delta;
		if (newSize >= 1 && newSize <= 5) {
			textSizeStore.value = newSize;
		}
	}

	function handleThemeChange(theme: ThemeOption) {
		themeStore.value = theme;
		showTheme = false;
	}

	// Touch swipe
	function handleTouchStart(e: TouchEvent) {
		swipeStart = e.touches[0].clientX;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (swipeStart === null) return;

		const swipeEnd = e.changedTouches[0].clientX;
		const diff = swipeStart - swipeEnd;

		if (Math.abs(diff) > 50) {
			if (diff > 0) handleNext();
			else handlePrev();
		}

		swipeStart = null;
	}

	function toggleSync() {
		syncEnabled = !syncEnabled;
		realtimeSyncStore.setSyncEnabled(syncEnabled);
	}

	function handleBack() {
		goto(`/admin/mass/${massId}`);
	}
</script>

<svelte:head>
	<title>
		{massConfig ? `관리자 뷰 - ${massConfig.groom_name} ❤️ ${massConfig.bride_name}` : '관리자 미사 뷰'}
	</title>
</svelte:head>

<div
	class="min-h-screen bg-background {themeStore.value}"
	class:text-size-1={textSizeStore.value === 1}
	class:text-size-2={textSizeStore.value === 2}
	class:text-size-3={textSizeStore.value === 3}
	class:text-size-4={textSizeStore.value === 4}
	class:text-size-5={textSizeStore.value === 5}
>
	<!-- Loading state -->
	{#if loadingMass}
		<div class="flex items-center justify-center min-h-screen">
			<div
				class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"
			></div>
		</div>
	{:else if massError}
		<!-- Error state -->
		<div class="flex flex-col items-center justify-center min-h-screen px-4">
			<div class="text-red-500 text-5xl mb-4">✗</div>
			<p class="text-xl text-foreground mb-4">{massError}</p>
			<button
				onclick={handleBack}
				class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
			>
				관리 페이지로 돌아가기
			</button>
		</div>
	{:else}
		<!-- Admin controls header -->
		<div class="sticky top-0 z-20 bg-blue-100 border-b border-blue-300">
			<div class="max-w-2xl mx-auto px-4 py-2">
				<div class="flex items-center justify-between gap-3 mb-2">
					<button
						onclick={handleBack}
						class="flex items-center gap-2 text-sm text-blue-900 hover:text-blue-700"
					>
						<ArrowLeft class="w-4 h-4" />
						관리 페이지
					</button>
					<span class="text-sm font-semibold text-blue-900">관리자 모드</span>
				</div>

				<!-- Compact Sync Control -->
				<div class="bg-white rounded-md p-3 shadow-sm">
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-3">
							<button
								onclick={toggleSync}
								class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {syncEnabled
									? 'bg-green-500'
									: 'bg-gray-300'}"
								aria-label="동기화 토글"
							>
								<span
									class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {syncEnabled
										? 'translate-x-6'
										: 'translate-x-1'}"
								></span>
							</button>
							<span class="text-sm font-medium">
								{syncEnabled ? '동기화 ON' : '동기화 OFF'}
							</span>
						</div>

						{#if syncEnabled && realtimeSyncStore.state.connected}
							<span class="text-sm font-semibold text-green-700">
								{realtimeSyncStore.state.connectedUsers}명 연결
							</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Header -->
		<Header
			{currentStep}
			{totalSteps}
			onTocToggle={() => (showToc = !showToc)}
			onInfoToggle={() => (showInfo = !showInfo)}
			onTextSizeChange={handleTextSizeChange}
			showInfoButton={true}
		/>

		<!-- Main content -->
		<main
			class="pb-20"
			ontouchstart={handleTouchStart}
			ontouchend={handleTouchEnd}
		>
			<StepCard
				step={currentStep}
				{massConfig}
				onPrev={handlePrev}
				onNext={handleNext}
				canGoPrev={filteredMassSteps.findIndex((s) => s.id === currentStepIdStore.value) > 0}
				canGoNext={filteredMassSteps.findIndex((s) => s.id === currentStepIdStore.value) <
					filteredMassSteps.length - 1}
			/>
		</main>

		<!-- Settings button -->
		<button
			onclick={() => (showTheme = true)}
			class="fixed right-4 bottom-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center z-10"
			aria-label="설정"
		>
			<Settings class="w-6 h-6" />
		</button>

		<!-- Table of Contents -->
		{#if showToc}
			<TableOfContents
				steps={filteredMassSteps}
				{currentSections}
				currentStepId={currentStepIdStore.value}
				onClose={() => (showToc = false)}
				onSelect={handleTocSelect}
			/>
		{/if}

		<!-- Theme Selector -->
		{#if showTheme}
			<ThemeSelector
				currentTheme={themeStore.value}
				onSelect={handleThemeChange}
				onClose={() => (showTheme = false)}
			/>
		{/if}

		<!-- Mass Info Page -->
		{#if showInfo && massConfig}
			<MassInfoPage {massConfig} onClose={() => (showInfo = false)} />
		{/if}
	{/if}
</div>
