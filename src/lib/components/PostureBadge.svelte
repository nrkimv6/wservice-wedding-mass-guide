<script lang="ts">
	import { User, Armchair, Heart } from 'lucide-svelte';
	import type { MassStep } from '$lib/data/massSteps';
	import { getPostureLabel } from '$lib/data/massSteps';

	interface Props {
		posture: MassStep['posture'];
	}

	let { posture }: Props = $props();

	const iconMap = {
		standing: User,
		seated: Armchair,
		kneeling: Heart
	};

	const Icon = $derived(posture ? iconMap[posture] : null);
	const label = $derived(posture ? getPostureLabel(posture) : '');
</script>

{#if posture && Icon}
	<span class="posture-badge posture-{posture}">
		<Icon class="w-4 h-4" />
		<span>{label}</span>
	</span>
{/if}
