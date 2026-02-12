<script lang="ts">
	interface Props {
		show: boolean;
		onDismiss: () => void;
	}

	let { show, onDismiss }: Props = $props();
</script>

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={onDismiss}
	>
		<div class="flex flex-col items-center gap-4 px-8 py-6 bg-card rounded-xl shadow-xl">
			<div class="flex items-center gap-3">
				<span class="text-4xl animate-swipe">👆</span>
				<span class="text-2xl text-muted-foreground">←→</span>
			</div>
			<p class="text-center text-card-foreground font-medium">
				좌우로 스와이프하여<br />단계를 이동하세요
			</p>
			<p class="text-sm text-muted-foreground">탭하여 닫기</p>
		</div>
	</div>
{/if}

<style>
	@keyframes swipe-motion {
		0%,
		100% {
			transform: translateX(-30px);
		}
		50% {
			transform: translateX(30px);
		}
	}

	.animate-swipe {
		animation: swipe-motion 2s ease-in-out infinite;
	}
</style>
