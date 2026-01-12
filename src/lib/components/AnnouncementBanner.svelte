<script lang="ts">
	import { X } from 'lucide-svelte';
	import { browser } from '$app/environment';

	interface Props {
		announcement: string;
		onDismiss: () => void;
	}

	let { announcement, onDismiss }: Props = $props();
</script>

<div
	class="bg-primary/10 border-primary/30 border-l-4 border-l-primary px-4 py-3 shadow-sm"
	role="alert"
>
	<div class="flex items-start gap-3">
		<div class="flex-1">
			<p class="text-sm leading-relaxed text-foreground">{announcement}</p>
		</div>
		<button
			onclick={onDismiss}
			class="shrink-0 rounded-lg p-1 hover:bg-muted transition-colors"
			aria-label="공지사항 닫기"
		>
			<X class="w-4 h-4" />
		</button>
	</div>
</div>
