<script lang="ts">
	import { Heart, Cross, Users, BookOpen, Palette, List, ListTree } from 'lucide-svelte';
	import type { ThemeOption } from './ThemeSelector.svelte';

	export type ViewMode = 'detailed' | 'merged';

	interface Props {
		onStart: () => void;
		onOpenTheme: () => void;
		currentTheme: ThemeOption;
		viewMode: ViewMode;
		onViewModeChange: (mode: ViewMode) => void;
	}

	let { onStart, onOpenTheme, currentTheme, viewMode, onViewModeChange }: Props = $props();

	const themeNames: Record<ThemeOption, string> = {
		'ivory-gold': 'Ivory Gold',
		'white-rose': 'White Rose',
		cathedral: 'Cathedral Classic',
		sage: 'Natural Sage'
	};
</script>

<div class="min-h-screen bg-background flex flex-col">
	<div class="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-[500px] mx-auto">
		<!-- Logo/Title -->
		<div class="text-center mb-10">
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
				<Cross class="w-10 h-10 text-primary" />
			</div>
			<h1 class="text-3xl font-bold text-foreground mb-2">혼배미사</h1>
			<p class="text-muted-foreground">Catholic Wedding Mass</p>
		</div>

		<!-- Info cards -->
		<div class="w-full space-y-4 mb-10">
			<!-- Sign of cross -->
			<div class="bg-card rounded-xl p-5 border border-border">
				<div class="flex items-start gap-4">
					<div class="p-2 bg-primary/10 rounded-lg shrink-0">
						<Cross class="w-5 h-5 text-primary" />
					</div>
					<div>
						<h3 class="font-semibold text-foreground mb-1">성호경</h3>
						<p class="text-sm text-muted-foreground leading-relaxed">
							이마 → 가슴 → 왼쪽 어깨 → 오른쪽 어깨 순서로<br />
							"성부와 성자와 성령의 이름으로. 아멘."
						</p>
					</div>
				</div>
			</div>

			<!-- Symbols -->
			<div class="bg-card rounded-xl p-5 border border-border">
				<div class="flex items-start gap-4">
					<div class="p-2 bg-primary/10 rounded-lg shrink-0">
						<BookOpen class="w-5 h-5 text-primary" />
					</div>
					<div>
						<h3 class="font-semibold text-foreground mb-1">기호 안내</h3>
						<div class="text-sm text-muted-foreground space-y-1">
							<p><span class="font-medium text-secondary">†</span> 사제의 말씀</p>
							<p><span class="font-bold text-foreground">○</span> 회중의 응답 (함께 말합니다)</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Communion guidance -->
			<div class="bg-card rounded-xl p-5 border border-border">
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
			</div>
		</div>

		<!-- View mode selector -->
		<div class="w-full mb-4">
			<p class="text-sm text-muted-foreground mb-2 text-center">순서지 보기 방식</p>
			<div class="grid grid-cols-2 gap-2">
				<button
					onclick={() => onViewModeChange('detailed')}
					class="flex flex-col items-center gap-1 py-3 px-4 rounded-xl border transition-colors min-h-[72px] {viewMode ===
					'detailed'
						? 'bg-primary/10 border-primary text-primary'
						: 'border-border hover:bg-muted text-foreground'}"
				>
					<ListTree class="w-5 h-5" />
					<span class="text-sm font-medium">상세 (32단계)</span>
					<span class="text-xs text-muted-foreground">처음 참례하는 분</span>
				</button>
				<button
					onclick={() => onViewModeChange('merged')}
					class="flex flex-col items-center gap-1 py-3 px-4 rounded-xl border transition-colors min-h-[72px] {viewMode ===
					'merged'
						? 'bg-primary/10 border-primary text-primary'
						: 'border-border hover:bg-muted text-foreground'}"
				>
					<List class="w-5 h-5" />
					<span class="text-sm font-medium">간결 (18단계)</span>
					<span class="text-xs text-muted-foreground">전체 흐름 파악</span>
				</button>
			</div>
		</div>

		<!-- Theme selector button -->
		<button
			onclick={onOpenTheme}
			class="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-border hover:bg-muted transition-colors mb-4 min-h-[44px]"
		>
			<Palette class="w-5 h-5 text-primary" />
			<span class="text-foreground">테마: {themeNames[currentTheme]}</span>
		</button>

		<!-- Start button -->
		<button
			onclick={onStart}
			class="w-full py-4 px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 min-h-[56px] shadow-md"
		>
			<Heart class="w-5 h-5" />
			미사 시작하기
		</button>
	</div>

	<!-- Footer -->
	<footer class="py-4 text-center text-sm text-muted-foreground">
		축복받은 혼인 되시길 기도합니다 🙏
	</footer>
</div>
