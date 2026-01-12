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
			<p class="text-sm leading-relaxed whitespace-pre-line">
				{prayer.text}
			</p>
			{#if prayer.instruction}
				<p class="text-xs text-muted-foreground italic mt-1">
					{prayer.instruction}
				</p>
			{/if}
		</div>
	{/each}
</div>
