<script lang="ts">
	import { X } from 'lucide-svelte';
	import { sections } from '$lib/data/massSteps';

	interface Props {
		currentStep: number;
		onSelectSection: (stepId: number) => void;
		onClose: () => void;
	}

	let { currentStep, onSelectSection, onClose }: Props = $props();

	function getCurrentSection() {
		for (const section of sections) {
			if (currentStep >= section.range[0] && currentStep <= section.range[1]) {
				return section.name;
			}
		}
		return sections[0].name;
	}

	const currentSection = $derived(getCurrentSection());
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-foreground/30 z-50" onclick={onClose}>
	<div
		class="absolute top-0 left-0 right-0 bg-popover border-b border-border shadow-lg origin-top max-h-[70vh] overflow-auto"
		onclick={(e) => e.stopPropagation()}
	>
		<div
			class="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-popover"
		>
			<h3 class="font-bold text-lg text-foreground">목차</h3>
			<button
				onclick={onClose}
				class="p-2 rounded-full hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
				aria-label="목차 닫기"
			>
				<X class="w-5 h-5" />
			</button>
		</div>

		<nav class="p-2">
			{#each sections as section}
				{@const isActive = section.name === currentSection}
				<button
					onclick={() => {
						onSelectSection(section.range[0]);
						onClose();
					}}
					class="w-full text-left p-4 rounded-lg transition-colors min-h-[44px] {isActive
						? 'bg-primary/10 border-l-4 border-primary'
						: 'hover:bg-muted'}"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="font-medium {isActive ? 'text-primary' : 'text-foreground'}">
								{section.name}
							</p>
							<p class="text-sm text-muted-foreground">
								{section.nameEn}
							</p>
						</div>
						<span class="text-sm text-muted-foreground">
							{section.range[0]}-{section.range[1]}
						</span>
					</div>
				</button>
			{/each}
		</nav>
	</div>
</div>
