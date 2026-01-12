<script lang="ts">
	import { X } from 'lucide-svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	// Mock data - 추후 실제 데이터로 교체 예정
	const massInfo = {
		churchName: '명동대성당',
		date: '2026년 2월 14일 (토)',
		time: '14:00',
		groomName: '홍길동',
		brideName: '김영희',
		celebrantName: '김바오로 신부',
		liturgicalSeason: 'lent', // 'ordinary' | 'advent' | 'lent' | 'easter'
		hymns: {
			entrance: { number: '152', title: '다함께 노래해', page: '87' },
			responsorial: '주보 참조',
			offertory: { number: '234', title: '주님께 드리는', page: '142' },
			communion: [
				{ number: '312', title: '생명의 빵', page: '189' },
				{ number: '415', title: '주님의 사랑', page: '245' }
			],
			recessional: { number: '401', title: '기쁜 소식', page: '231' },
			wedding: null // 축가 없음
		}
	};

	const liturgicalSeasonLabel = {
		ordinary: '연중시기',
		advent: '대림시기',
		lent: '사순시기',
		easter: '부활시기'
	};
</script>

<div
	class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
	onclick={onClose}
	role="dialog"
	aria-modal="true"
	aria-labelledby="mass-info-title"
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="bg-background rounded-lg shadow-xl max-w-[500px] w-full max-h-[90vh] overflow-y-auto"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Header -->
		<div
			class="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between"
		>
			<h2 id="mass-info-title" class="text-lg font-bold">혼배미사 정보</h2>
			<button
				onclick={onClose}
				class="p-2 rounded-lg hover:bg-muted transition-colors"
				aria-label="닫기"
			>
				<X class="w-5 h-5" />
			</button>
		</div>

		<!-- Content -->
		<div class="p-6 space-y-6">
			<!-- 상세정보 -->
			<section>
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-lg">
						<span>💒</span>
						<span class="font-semibold">{massInfo.churchName}</span>
					</div>
					<div class="flex items-center gap-2 text-base text-foreground/90">
						<span>📅</span>
						<span>{massInfo.date} {massInfo.time}</span>
					</div>
					<div class="flex items-center gap-2 text-base text-foreground/90">
						<span>👰</span>
						<span>신부: {massInfo.brideName}</span>
					</div>
					<div class="flex items-center gap-2 text-base text-foreground/90">
						<span>🤵</span>
						<span>신랑: {massInfo.groomName}</span>
					</div>
					<div class="flex items-center gap-2 text-base text-foreground/90">
						<span>⛪</span>
						<span>주례: {massInfo.celebrantName}</span>
					</div>
				</div>
			</section>

			<hr class="border-border" />

			<!-- 성가 안내 -->
			<section>
				<h3 class="text-base font-bold mb-4 flex items-center gap-2">
					<span>🎵</span>
					<span>성가 안내</span>
				</h3>

				<div class="space-y-3 bg-muted/30 rounded-lg p-4">
					<!-- 입당성가 -->
					{#if massInfo.hymns.entrance}
						<div class="grid grid-cols-[80px_1fr] gap-2 text-sm">
							<span class="text-muted-foreground">입당</span>
							<span class="font-medium"
								>{massInfo.hymns.entrance.number}번 - {massInfo.hymns.entrance.title}
								<span class="text-muted-foreground ml-1">📖 {massInfo.hymns.entrance.page}p</span
								></span
							>
						</div>
					{/if}

					<!-- 화답송 -->
					<div class="grid grid-cols-[80px_1fr] gap-2 text-sm">
						<span class="text-muted-foreground">화답</span>
						<span class="font-medium">{massInfo.hymns.responsorial}</span>
					</div>

					<!-- 봉헌성가 -->
					{#if massInfo.hymns.offertory}
						<div class="grid grid-cols-[80px_1fr] gap-2 text-sm">
							<span class="text-muted-foreground">봉헌</span>
							<span class="font-medium"
								>{massInfo.hymns.offertory.number}번 - {massInfo.hymns.offertory.title}
								<span class="text-muted-foreground ml-1">📖 {massInfo.hymns.offertory.page}p</span
								></span
							>
						</div>
					{/if}

					<!-- 영성체송 (복수 가능) -->
					{#if massInfo.hymns.communion}
						<div class="grid grid-cols-[80px_1fr] gap-2 text-sm">
							<span class="text-muted-foreground">영성체</span>
							<div class="space-y-1">
								{#each massInfo.hymns.communion as communion}
									<div class="font-medium">
										{communion.number}번 - {communion.title}
										<span class="text-muted-foreground ml-1">📖 {communion.page}p</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- 파견성가 -->
					{#if massInfo.hymns.recessional}
						<div class="grid grid-cols-[80px_1fr] gap-2 text-sm">
							<span class="text-muted-foreground">파견</span>
							<span class="font-medium"
								>{massInfo.hymns.recessional.number}번 - {massInfo.hymns.recessional.title}
								<span class="text-muted-foreground ml-1">📖 {massInfo.hymns.recessional.page}p</span
								></span
							>
						</div>
					{/if}

					<!-- 축가 (있을 경우) -->
					{#if massInfo.hymns.wedding}
						<div class="grid grid-cols-[80px_1fr] gap-2 text-sm">
							<span class="text-muted-foreground">축가</span>
							<span class="font-medium"
								>{massInfo.hymns.wedding.number}번 - {massInfo.hymns.wedding.title}
								<span class="text-muted-foreground ml-1">📖 {massInfo.hymns.wedding.page}p</span
								></span
							>
						</div>
					{:else}
						<div class="text-xs text-muted-foreground italic">※ 축가 없음 (설정 안됨)</div>
					{/if}
				</div>
			</section>

			<!-- 전례시기 안내 -->
			{#if massInfo.liturgicalSeason === 'lent'}
				<section>
					<div class="bg-muted/50 border border-border rounded-lg p-4">
						<p class="text-sm text-foreground/80 flex items-start gap-2">
							<span class="shrink-0">ℹ️</span>
							<span
								>{liturgicalSeasonLabel[massInfo.liturgicalSeason]}로 대영광송과 알렐루야가 생략됩니다.</span
							>
						</p>
					</div>
				</section>
			{:else if massInfo.liturgicalSeason === 'advent'}
				<section>
					<div class="bg-muted/50 border border-border rounded-lg p-4">
						<p class="text-sm text-foreground/80 flex items-start gap-2">
							<span class="shrink-0">ℹ️</span>
							<span>{liturgicalSeasonLabel[massInfo.liturgicalSeason]}로 대영광송이 생략됩니다.</span>
						</p>
					</div>
				</section>
			{/if}
		</div>
	</div>
</div>
