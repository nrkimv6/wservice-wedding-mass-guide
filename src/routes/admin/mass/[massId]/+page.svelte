<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { ArrowLeft, QrCode, Copy, Download, ExternalLink, Edit, Play } from 'lucide-svelte';
	import QRCode from 'qrcode';
	import { getMass } from '$lib/services/massService';
	import type { MassConfiguration } from '$lib/types/mass';
	import SyncControl from '$lib/components/SyncControl.svelte';
	import { realtimeSyncStore } from '$lib/stores/realtimeSync.svelte';

	const massId = $derived($page.params.massId);

	let massData = $state<MassConfiguration | null>(null);
	let loading = $state(true);
	let error = $state('');

	let qrCodeDataUrl = $state('');
	let massUrl = $state('');
	let copySuccess = $state(false);

	// Sync state
	let syncEnabled = $state(false);

	onMount(async () => {
		// Load mass data
		const { data, error: loadError } = await getMass(massId);

		if (loadError || !data) {
			error = loadError?.message || '미사 정보를 불러올 수 없습니다.';
			loading = false;
			return;
		}

		massData = data;
		loading = false;

		// Generate QR code
		if (typeof window !== 'undefined') {
			massUrl = `${window.location.origin}/mass/${massId}`;
			qrCodeDataUrl = await QRCode.toDataURL(massUrl, {
				width: 400,
				margin: 2,
				color: {
					dark: '#000000',
					light: '#FFFFFF'
				}
			});
		}

		// Connect to realtime channel
		realtimeSyncStore.connect(massId);
	});

	onDestroy(() => {
		// Disconnect from realtime channel
		realtimeSyncStore.disconnect();
	});

	async function copyUrl() {
		try {
			await navigator.clipboard.writeText(massUrl);
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function downloadQR() {
		if (!massData) return;
		const link = document.createElement('a');
		link.download = `혼배미사-QR-${massData.groom_name}-${massData.bride_name}.png`;
		link.href = qrCodeDataUrl;
		link.click();
	}

	function openPreview() {
		window.open(massUrl, '_blank');
	}

	function editMass() {
		// TODO: Implement edit mode
		alert('편집 기능은 곧 추가됩니다');
	}

	function handleBack() {
		goto('/admin/dashboard');
	}

	function toggleSync() {
		syncEnabled = !syncEnabled;
		realtimeSyncStore.setSyncEnabled(syncEnabled);
	}

	function startMass() {
		goto(`/admin/mass/${massId}/view`);
	}
</script>

<svelte:head>
	<title>{massData ? `${massData.groom_name} ❤️ ${massData.bride_name} - 관리` : '미사 관리'}</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Loading state -->
	{#if loading}
		<div class="flex items-center justify-center min-h-screen">
			<div class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
		</div>
	<!-- Error state -->
	{:else if error || !massData}
		<div class="flex flex-col items-center justify-center min-h-screen px-4">
			<div class="text-red-500 text-5xl mb-4">✗</div>
			<p class="text-xl text-foreground mb-4">{error || '미사 정보를 찾을 수 없습니다'}</p>
			<button
				onclick={handleBack}
				class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
			>
				대시보드로 돌아가기
			</button>
		</div>
	<!-- Loaded state -->
	{:else}
		<!-- Header -->
		<header class="bg-card border-b border-border sticky top-0 z-10">
			<div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
				<button
					onclick={handleBack}
					class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeft class="w-5 h-5" />
					대시보드로
				</button>
				<h1 class="text-xl font-bold text-foreground">미사 관리</h1>
				<button
					onclick={editMass}
					class="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
				>
					<Edit class="w-4 h-4" />
					편집
				</button>
			</div>
		</header>

		<main class="max-w-4xl mx-auto px-4 py-8">
			<!-- Mass info -->
			<section class="bg-card border border-border rounded-lg p-6 mb-6">
				<h2 class="text-2xl font-bold mb-4 text-foreground">
					{massData.groom_name} ❤️ {massData.bride_name}
				</h2>
				<div class="space-y-2 text-muted-foreground">
					<p>
						📅 {new Date(massData.date).toLocaleDateString('ko-KR', {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
							weekday: 'short'
						})}
						{massData.time}
					</p>
					<p>💒 {massData.church_name}</p>
					{#if massData.celebrant_name}
						<p>⛪ 주례: {massData.celebrant_name}</p>
					{/if}
				</div>
			</section>

			<!-- Mass Control -->
			<section class="mb-6">
				<h2 class="text-xl font-semibold mb-3 text-foreground">미사 진행</h2>
				<div class="space-y-4">
					<!-- Start Mass Button -->
					<button
						onclick={startMass}
						class="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-3 text-lg font-semibold"
					>
						<Play class="w-6 h-6" />
						미사 진행하기 (관리자 뷰)
					</button>

					<!-- Sync Control -->
					<div>
						<h3 class="text-sm font-medium mb-2 text-muted-foreground">실시간 동기화 설정</h3>
						<SyncControl
							syncEnabled={syncEnabled}
							connected={realtimeSyncStore.state.connected}
							connectedUsers={realtimeSyncStore.state.connectedUsers}
							onToggle={toggleSync}
						/>
					</div>
				</div>
			</section>

		<!-- QR Code section -->
		<section class="bg-card border border-border rounded-lg p-6 mb-6">
			<div class="flex items-center gap-2 mb-4">
				<QrCode class="w-6 h-6 text-foreground" />
				<h2 class="text-xl font-semibold text-foreground">QR 코드</h2>
			</div>

			<div class="space-y-6">
				<!-- QR Code display -->
				{#if qrCodeDataUrl}
					<div class="flex flex-col items-center">
						<div class="bg-white p-6 rounded-lg border-2 border-border shadow-sm">
							<img src={qrCodeDataUrl} alt="미사 QR 코드" class="w-64 h-64" />
						</div>
						<p class="text-sm text-muted-foreground mt-4 text-center">
							하객들이 이 QR 코드를 스캔하면 순서지에 접속할 수 있습니다
						</p>
					</div>
				{:else}
					<div class="flex items-center justify-center h-64">
						<p class="text-muted-foreground">QR 코드 생성 중...</p>
					</div>
				{/if}

				<!-- URL display -->
				<div>
					<label class="block text-sm font-medium mb-2">미사 URL</label>
					<div class="flex gap-2">
						<input
							type="text"
							value={massUrl}
							readonly
							class="flex-1 px-3 py-2 bg-accent border border-border rounded-md text-sm"
						/>
						<button
							onclick={copyUrl}
							class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
						>
							<Copy class="w-4 h-4" />
							{copySuccess ? '복사됨!' : '복사'}
						</button>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<button
						onclick={downloadQR}
						class="px-4 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
					>
						<Download class="w-5 h-5" />
						QR 코드 다운로드
					</button>
					<button
						onclick={openPreview}
						class="px-4 py-3 border border-border rounded-md hover:bg-accent transition-colors flex items-center justify-center gap-2"
					>
						<ExternalLink class="w-5 h-5" />
						미리보기
					</button>
				</div>
			</div>
		</section>

		<!-- Instructions -->
		<section class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
			<h3 class="font-semibold mb-3 text-blue-900">📱 사용 방법</h3>
			<ol class="space-y-2 text-sm text-blue-900">
				<li>1. QR 코드를 다운로드하여 청첩장이나 웨딩 안내물에 포함하세요</li>
				<li>2. 미사 당일, 하객들이 QR 코드를 스캔하면 순서지에 접속합니다</li>
				<li>3. 하객들은 자신의 스마트폰으로 미사 순서를 따라갈 수 있습니다</li>
				<li>
					4. 동기화 모드를 켜면 관리자가 보는 단계로 모든 하객이 자동으로 이동합니다
				</li>
			</ol>
		</section>

		<!-- Auto-delete warning -->
		<section class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
			<h3 class="font-semibold mb-2 text-yellow-900 flex items-center gap-2">
				⚠️ 중요: 데이터 자동 삭제 안내
			</h3>
			<div class="space-y-2 text-sm text-yellow-900">
				<p>
					<strong>미사 데이터는 미사 날짜 익일 자동으로 삭제됩니다.</strong>
				</p>
				<p>
					삭제 후에는 QR 코드가 작동하지 않으며, 모든 미사 정보가 영구적으로 제거됩니다. 필요한
					경우 미사 전에 스크린샷이나 백업을 해두시기 바랍니다.
				</p>
			</div>
		</section>
	</main>
	{/if}
</div>
