<script lang="ts">
	import type { MassStep } from '$lib/data/massSteps';
	import { getRoleLabel } from '$lib/data/massSteps';

	interface Props {
		role: MassStep['role'];
	}

	let { role }: Props = $props();

	const label = $derived(role ? getRoleLabel(role) : '');
</script>

{#if role}
	<span class="role-badge role-{role}">
		{label}
	</span>
{/if}
