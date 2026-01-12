<script lang="ts">
	import { Music } from 'lucide-svelte';
	import type { HymnPlaceholder } from '$lib/data/massSteps';

	interface Props {
		hymn: HymnPlaceholder;
	}

	let { hymn }: Props = $props();
</script>

<div class="hymn-box">
	<div class="flex items-center gap-2">
		<Music class="w-5 h-5 shrink-0" style="color: hsl(var(--hymn-border))" />
		<p class="font-medium">{hymn.label}</p>
	</div>
	<p class="text-sm text-muted-foreground mt-2">
		혼인 준비 시 선택한 성가를 부릅니다.
	</p>
</div>
