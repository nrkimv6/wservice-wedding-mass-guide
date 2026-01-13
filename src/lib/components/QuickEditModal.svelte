<script lang="ts">
	import { X } from 'lucide-svelte';
	import type { MassConfiguration } from '$lib/types/mass';

	interface Props {
		massConfig: MassConfiguration;
		onClose: () => void;
		onSave: (updates: Partial<MassConfiguration>) => Promise<void>;
	}

	let { massConfig, onClose, onSave }: Props = $props();

	// Editable fields
	let hymns = $state({ ...massConfig.hymns });
	let saving = $state(false);
	let error = $state('');

	async function handleSave() {
		saving = true;
		error = '';

		try {
			await onSave({ hymns });
			onClose();
		} catch (err) {
			error = err instanceof Error ? err.message : '저장 실패';
		} finally {
			saving = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

<div
	class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
	onclick={handleBackdropClick}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
>
	<div class="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
		<!-- Header -->
		<div class="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
			<h2 class="text-xl font-bold text-foreground">빠른 수정</h2>
			<button
				onclick={onClose}
				class="text-muted-foreground hover:text-foreground transition-colors"
				aria-label="닫기"
			>
				<X class="w-6 h-6" />
			</button>
		</div>

		<!-- Content -->
		<div class="p-6 space-y-6">
			{#if error}
				<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
					{error}
				</div>
			{/if}

			<!-- Hymns -->
			<section>
				<h3 class="text-lg font-semibold mb-4 text-foreground">🎵 성가 수정</h3>
				<div class="space-y-4">
					<!-- Entrance -->
					{#if hymns.entrance}
						<div>
							<label class="block text-sm font-medium mb-2 text-foreground">입당성가</label>
							<div class="grid grid-cols-3 gap-2">
								<input
									type="text"
									bind:value={hymns.entrance.number}
									placeholder="번호"
									class="px-3 py-2 border border-border rounded-md"
								/>
								<input
									type="text"
									bind:value={hymns.entrance.title}
									placeholder="제목"
									class="px-3 py-2 border border-border rounded-md"
								/>
								<input
									type="text"
									bind:value={hymns.entrance.page}
									placeholder="페이지"
									class="px-3 py-2 border border-border rounded-md"
								/>
							</div>
						</div>
					{/if}

					<!-- Offertory -->
					{#if hymns.offertory}
						<div>
							<label class="block text-sm font-medium mb-2 text-foreground">봉헌성가</label>
							<div class="grid grid-cols-3 gap-2">
								<input
									type="text"
									bind:value={hymns.offertory.number}
									placeholder="번호"
									class="px-3 py-2 border border-border rounded-md"
								/>
								<input
									type="text"
									bind:value={hymns.offertory.title}
									placeholder="제목"
									class="px-3 py-2 border border-border rounded-md"
								/>
								<input
									type="text"
									bind:value={hymns.offertory.page}
									placeholder="페이지"
									class="px-3 py-2 border border-border rounded-md"
								/>
							</div>
						</div>
					{/if}

					<!-- Communion -->
					{#if hymns.communion && Array.isArray(hymns.communion) && hymns.communion.length > 0}
						<div>
							<label class="block text-sm font-medium mb-2 text-foreground">영성체송</label>
							<div class="space-y-2">
								{#each hymns.communion as communionHymn, idx}
									<div class="grid grid-cols-3 gap-2">
										<input
											type="text"
											bind:value={communionHymn.number}
											placeholder="번호"
											class="px-3 py-2 border border-border rounded-md"
										/>
										<input
											type="text"
											bind:value={communionHymn.title}
											placeholder="제목"
											class="px-3 py-2 border border-border rounded-md"
										/>
										<input
											type="text"
											bind:value={communionHymn.page}
											placeholder="페이지"
											class="px-3 py-2 border border-border rounded-md"
										/>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Recessional -->
					{#if hymns.recessional}
						<div>
							<label class="block text-sm font-medium mb-2 text-foreground">파견성가</label>
							<div class="grid grid-cols-3 gap-2">
								<input
									type="text"
									bind:value={hymns.recessional.number}
									placeholder="번호"
									class="px-3 py-2 border border-border rounded-md"
								/>
								<input
									type="text"
									bind:value={hymns.recessional.title}
									placeholder="제목"
									class="px-3 py-2 border border-border rounded-md"
								/>
								<input
									type="text"
									bind:value={hymns.recessional.page}
									placeholder="페이지"
									class="px-3 py-2 border border-border rounded-md"
								/>
							</div>
						</div>
					{/if}
				</div>
			</section>

			<p class="text-xs text-muted-foreground">
				💡 수정 사항은 즉시 저장되며, 연결된 모든 하객에게 실시간으로 반영됩니다.
			</p>
		</div>

		<!-- Footer -->
		<div
			class="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex gap-3 justify-end"
		>
			<button
				onclick={onClose}
				class="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
				disabled={saving}
			>
				취소
			</button>
			<button
				onclick={handleSave}
				class="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
				disabled={saving}
			>
				{saving ? '저장 중...' : '💾 저장 (즉시 반영)'}
			</button>
		</div>
	</div>
</div>
