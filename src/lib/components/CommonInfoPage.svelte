<script lang="ts">
	import { X } from 'lucide-svelte';
	import { APP_VERSION } from '$lib/config';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();
</script>

<div
	class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
	onclick={onClose}
	role="dialog"
	aria-modal="true"
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="bg-background rounded-lg shadow-xl max-w-[500px] w-full"
		onclick={(e) => e.stopPropagation()}
	>
		<div
			class="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between"
		>
			<h2 class="text-lg font-bold">혼배미사 안내</h2>
			<button
				onclick={onClose}
				class="p-2 rounded-lg hover:bg-muted transition-colors"
				aria-label="닫기"
			>
				<X class="w-5 h-5" />
			</button>
		</div>
		<div class="p-6 space-y-4">
			<p class="text-foreground/80">이 앱은 가톨릭 혼배미사 순서를 안내합니다.</p>
			<p class="text-foreground/80">
				개별 미사 정보는 전용 링크(QR코드)를 통해 접속하면 확인할 수 있습니다.
			</p>
			<div class="bg-muted/30 rounded-lg p-4 text-sm space-y-2">
				<p class="font-semibold">사용 방법</p>
				<ul class="list-disc list-inside space-y-1 text-foreground/70">
					<li>좌우 스와이프 또는 화살표 버튼으로 단계 이동</li>
					<li>상단 +/- 버튼으로 글자 크기 조절</li>
					<li>좌측 ☰ 버튼으로 목차 열기</li>
					<li>우측 하단 ⚙ 버튼으로 테마 변경</li>
				</ul>
			</div>
		</div>
		<div class="px-6 pb-4 text-right">
			<span class="text-xs text-foreground/40">v{APP_VERSION}</span>
		</div>
	</div>
</div>
