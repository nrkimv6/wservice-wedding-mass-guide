<script lang="ts">
	import { Plus, X, GripVertical } from 'lucide-svelte';
	import type { Announcement } from '$lib/types/mass';

	interface Props {
		announcements: Announcement[];
		onUpdate: (announcements: Announcement[]) => void;
	}

	let { announcements = [], onUpdate }: Props = $props();

	let newMessage = $state('');

	function addAnnouncement() {
		if (!newMessage.trim()) return;

		const newAnnouncement: Announcement = {
			id: crypto.randomUUID(),
			message: newMessage.trim(),
			order: announcements.length
		};

		onUpdate([...announcements, newAnnouncement]);
		newMessage = '';
	}

	function removeAnnouncement(id: string) {
		const filtered = announcements.filter(a => a.id !== id);
		// Re-order after removal
		const reordered = filtered.map((a, index) => ({ ...a, order: index }));
		onUpdate(reordered);
	}

	function moveUp(index: number) {
		if (index === 0) return;
		const copy = [...announcements];
		[copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
		// Update order values
		const reordered = copy.map((a, i) => ({ ...a, order: i }));
		onUpdate(reordered);
	}

	function moveDown(index: number) {
		if (index === announcements.length - 1) return;
		const copy = [...announcements];
		[copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
		// Update order values
		const reordered = copy.map((a, i) => ({ ...a, order: i }));
		onUpdate(reordered);
	}

	// Sort announcements by order
	const sortedAnnouncements = $derived([...announcements].sort((a, b) => a.order - b.order));
</script>

<div class="space-y-4">
	<h3 class="text-lg font-semibold text-foreground">📢 공지사항</h3>

	<!-- Announcement List -->
	{#if sortedAnnouncements.length > 0}
		<div class="space-y-2">
			{#each sortedAnnouncements as announcement, index (announcement.id)}
				<div class="bg-card border border-border rounded-lg p-3 flex items-start gap-2">
					<!-- Drag handle -->
					<div class="flex flex-col gap-1 pt-1">
						<button
							onclick={() => moveUp(index)}
							disabled={index === 0}
							class="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
							aria-label="위로 이동"
						>
							▲
						</button>
						<GripVertical class="w-4 h-4 text-muted-foreground" />
						<button
							onclick={() => moveDown(index)}
							disabled={index === sortedAnnouncements.length - 1}
							class="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
							aria-label="아래로 이동"
						>
							▼
						</button>
					</div>

					<!-- Message -->
					<div class="flex-1 pt-2">
						<p class="text-sm text-foreground">{announcement.message}</p>
					</div>

					<!-- Delete button -->
					<button
						onclick={() => removeAnnouncement(announcement.id)}
						class="text-red-500 hover:text-red-700 p-1"
						aria-label="삭제"
					>
						<X class="w-4 h-4" />
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">공지사항이 없습니다.</p>
	{/if}

	<!-- Add New Announcement -->
	<div class="space-y-2">
		<input
			type="text"
			bind:value={newMessage}
			onkeypress={(e) => e.key === 'Enter' && addAnnouncement()}
			placeholder="새 공지사항 입력..."
			class="w-full px-3 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
		/>
		<button
			onclick={addAnnouncement}
			disabled={!newMessage.trim()}
			class="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			<Plus class="w-4 h-4" />
			공지 추가
		</button>
	</div>

	<!-- Info -->
	<p class="text-xs text-muted-foreground">
		💡 공지사항은 미사 시작 전 화면에 순서대로 표시됩니다. 최대 3개까지 권장합니다.
	</p>
</div>
