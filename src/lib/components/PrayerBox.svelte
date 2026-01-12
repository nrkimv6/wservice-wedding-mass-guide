<script lang="ts">
	import type { Prayer } from '$lib/data/massSteps';

	interface Props {
		prayers: Prayer[];
	}

	let { prayers }: Props = $props();
</script>

<div class="prayer-box space-y-3">
	{#each prayers as prayer}
		<div class="prayer-item">
			<p class="whitespace-pre-line" style="font-size: var(--content-font-size, 18px); line-height: var(--content-line-height, 1.7);">
				{prayer.text}
			</p>
			{#if prayer.instruction}
				<p class="text-muted-foreground italic mt-1" style="font-size: calc(var(--content-font-size, 18px) * 0.8);">
					{prayer.instruction}
				</p>
			{/if}
		</div>
	{/each}
</div>
