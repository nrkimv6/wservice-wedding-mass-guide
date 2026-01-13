<script lang="ts">
	import { Heart, Cross, Users, BookOpen, List, ListTree } from 'lucide-svelte';

	export type ViewMode = 'detailed' | 'merged';

	interface MassInfo {
		groomName: string;
		brideName: string;
		churchName: string;
		date: string;
		time: string;
		celebrantName?: string;
	}

	interface Props {
		onStart?: () => void;
		onstart?: () => void;  // lowercase variant for compatibility
		viewMode?: ViewMode;
		onViewModeChange?: (mode: ViewMode) => void;
		massInfo?: MassInfo;
	}

	let { onStart, onstart, viewMode, onViewModeChange, massInfo }: Props = $props();

	// Use lowercase or uppercase variant
	const startHandler = onstart || onStart || (() => {});
</script>

<div class="bg-background flex min-h-screen flex-col">
	<div class="mx-auto flex max-w-[500px] flex-1 flex-col items-center justify-center px-6 py-12">
		<!-- Logo/Title -->
		<div class="mb-10 text-center">
			<div
				class="bg-primary/10 mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full"
			>
				<Cross class="text-primary h-10 w-10" />
			</div>
			<h1 class="text-foreground mb-2 text-3xl font-bold">혼배미사</h1>
			<p class="text-muted-foreground">Catholic Wedding Mass</p>

			<!-- Mass info (if provided) -->
			{#if massInfo}
				<div class="mt-6 bg-card border border-border rounded-lg p-4">
					<div class="flex items-center justify-center gap-2 mb-2">
						<Heart class="w-5 h-5 text-primary fill-primary" />
						<h2 class="text-lg font-semibold text-foreground">
							{massInfo.groomName} ❤️ {massInfo.brideName}
						</h2>
					</div>
					<div class="space-y-1 text-sm text-muted-foreground">
						<p>📅 {new Date(massInfo.date).toLocaleDateString('ko-KR', {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
							weekday: 'short'
						})} {massInfo.time}</p>
						<p>💒 {massInfo.churchName}</p>
						{#if massInfo.celebrantName}
							<p>⛪ 주례: {massInfo.celebrantName}</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Info cards -->
		<div class="mb-10 w-full space-y-4">
			<!-- Sign of cross -->
			<!-- <div class="bg-card border-border rounded-xl border p-5">
				<div class="flex items-start gap-4">
					<div class="bg-primary/10 shrink-0 rounded-lg p-2">
						<Cross class="text-primary h-5 w-5" />
					</div>
					<div>
						<h3 class="text-foreground mb-1 font-semibold">성호경 긋는 방법</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">
							이마 → 가슴 → 왼쪽 어깨 → 오른쪽 어깨 순서로<br />
							"성부와 성자와 성령의 이름으로. 아멘."
						</p>
					</div>
				</div>
			</div> -->

			<!-- Symbols -->
			<div class="bg-card border-border rounded-xl border p-5">
				<div class="flex items-start gap-4">
					<div class="bg-primary/10 shrink-0 rounded-lg p-2">
						<BookOpen class="text-primary h-5 w-5" />
					</div>
					<div>
						<h3 class="text-foreground mb-1 font-semibold">기호 안내</h3>
						<div class="text-muted-foreground space-y-1 text-sm">
							<p><span class="text-secondary font-medium">†</span> 사제의 말씀</p>
							<p><span class="text-foreground font-bold">○</span> 회중의 응답 (함께 말합니다)</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Communion guidance : 여기서 말고 해당 스텝에 직접 안내할것. -->
			<!-- <div class="bg-card rounded-xl p-5 border border-border">
				<div class="flex items-start gap-4">
					<div class="p-2 bg-primary/10 rounded-lg shrink-0">
						<Users class="w-5 h-5 text-primary" />
					</div>
					<div>
						<h3 class="font-semibold text-foreground mb-1">영성체 안내</h3>
						<p class="text-sm text-muted-foreground leading-relaxed">
							가톨릭 신자만 영성체를 할 수 있습니다.<br />
							비신자분들은 자리에서 함께 기도하시거나,<br />
							팔짱을 끼고 나가시면 축복을 받을 수 있습니다.
						</p>
					</div>
				</div>
			</div> -->
		</div>

		<!-- View mode selector (only if onViewModeChange is provided) -->
		{#if onViewModeChange && viewMode}
			<div class="mb-4 w-full">
				<p class="text-muted-foreground mb-2 text-center text-sm">순서지 보기 방식</p>
				<div class="grid grid-cols-2 gap-2">
					<button
						onclick={() => onViewModeChange('detailed')}
						class="flex min-h-[72px] flex-col items-center gap-1 rounded-xl border px-4 py-3 transition-colors {viewMode ===
						'detailed'
							? 'bg-primary/10 border-primary text-primary'
							: 'border-border hover:bg-muted text-foreground'}"
					>
						<ListTree class="h-5 w-5" />
						<span class="text-sm font-medium">상세 (32단계)</span>
						<span class="text-muted-foreground text-xs">처음 참례하는 분</span>
					</button>
					<button
						onclick={() => onViewModeChange('merged')}
						class="flex min-h-[72px] flex-col items-center gap-1 rounded-xl border px-4 py-3 transition-colors {viewMode ===
						'merged'
							? 'bg-primary/10 border-primary text-primary'
							: 'border-border hover:bg-muted text-foreground'}"
					>
						<List class="h-5 w-5" />
						<span class="text-sm font-medium">간결 (18단계)</span>
						<span class="text-muted-foreground text-xs">전체 흐름 파악</span>
					</button>
				</div>
			</div>
		{/if}

		<!-- Start button -->
		<button
			onclick={startHandler}
			class="bg-primary text-primary-foreground flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-lg font-semibold shadow-md transition-opacity hover:opacity-90"
		>
			<Heart class="h-5 w-5" />
			미사 시작하기
		</button>
	</div>

	<!-- Footer -->
	<footer class="text-muted-foreground py-4 text-center text-sm">
		축복받은 혼인 되시길 기도합니다 🙏
	</footer>
</div>
