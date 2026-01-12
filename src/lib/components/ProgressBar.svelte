<script lang="ts">
	interface Props {
		currentStep: number;
		totalSteps: number;
	}

	let { currentStep, totalSteps }: Props = $props();

	const percentage = $derived(Math.round((currentStep / totalSteps) * 100));
</script>

<div class="w-full h-1.5 bg-muted rounded-full overflow-hidden">
	<div
		class="h-full bg-primary transition-all duration-300 ease-in-out"
		style="width: {percentage}%"
		role="progressbar"
		aria-valuenow={currentStep}
		aria-valuemin="1"
		aria-valuemax={totalSteps}
		aria-label="{currentStep}/{totalSteps} 단계"
	></div>
</div>
