<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Save, QrCode } from 'lucide-svelte';
	import type { ThemeOption } from '$lib/components/ThemeSelector.svelte';
	import type { ViewMode } from '$lib/components/IntroScreen.svelte';

	// Form data
	let formData = $state({
		// 상세정보
		churchName: '',
		date: '',
		time: '',
		groomName: '',
		brideName: '',
		celebrantName: '',

		// 성가
		hymns: {
			entrance: { number: '', title: '', page: '' },
			responsorial: '주보 참조', // "주보 참조" | "직접 입력" | "미표시"
			responsorialText: '',
			offertory: { number: '', title: '', page: '' },
			communion: [{ number: '', title: '', page: '' }],
			recessional: { number: '', title: '', page: '' },
			wedding: { number: '', title: '', page: '' }
		},

		// 전례시기
		liturgicalSeason: 'ordinary' as 'ordinary' | 'advent' | 'lent' | 'easter',
		gloria: true,
		alleluia: true,

		// 테마
		theme: 'ivory-gold' as ThemeOption,

		// 보기 모드
		viewMode: 'detailed' as ViewMode
	});

	// 전례시기 프리셋
	const liturgicalPresets = {
		ordinary: { label: '연중시기', gloria: true, alleluia: true },
		advent: { label: '대림시기', gloria: false, alleluia: true },
		lent: { label: '사순시기', gloria: false, alleluia: false },
		easter: { label: '부활시기', gloria: true, alleluia: true }
	};

	function applyLiturgicalPreset(season: keyof typeof liturgicalPresets) {
		formData.liturgicalSeason = season;
		formData.gloria = liturgicalPresets[season].gloria;
		formData.alleluia = liturgicalPresets[season].alleluia;
	}

	function addCommunionHymn() {
		formData.hymns.communion = [...formData.hymns.communion, { number: '', title: '', page: '' }];
	}

	function removeCommunionHymn(index: number) {
		formData.hymns.communion = formData.hymns.communion.filter((_, i) => i !== index);
	}

	function handleSave(e: Event) {
		e.preventDefault();
		// TODO: Save to database
		console.log('Saving mass configuration:', formData);
		// For now, redirect to a demo mass ID
		goto('/admin/mass/demo-1');
	}

	function handleCancel() {
		goto('/admin/dashboard');
	}
</script>

<svelte:head>
	<title>새 미사 만들기 - 관리자</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="bg-card border-b border-border sticky top-0 z-10">
		<div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
			<button
				onclick={handleCancel}
				class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
			>
				<ArrowLeft class="w-5 h-5" />
				대시보드로
			</button>
			<h1 class="text-xl font-bold text-foreground">새 미사 만들기</h1>
			<div class="w-24"></div>
		</div>
	</header>

	<!-- Main form -->
	<main class="max-w-4xl mx-auto px-4 py-8">
		<form onsubmit={handleSave} class="space-y-8">
			<!-- 상세정보 -->
			<section class="bg-card border border-border rounded-lg p-6">
				<h2 class="text-lg font-semibold mb-4 text-foreground">📍 상세정보</h2>
				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="churchName" class="block text-sm font-medium mb-1">장소</label>
							<input
								type="text"
								id="churchName"
								bind:value={formData.churchName}
								class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="예: 명동대성당"
								required
							/>
						</div>
						<div class="grid grid-cols-2 gap-2">
							<div>
								<label for="date" class="block text-sm font-medium mb-1">날짜</label>
								<input
									type="date"
									id="date"
									bind:value={formData.date}
									class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
									required
								/>
							</div>
							<div>
								<label for="time" class="block text-sm font-medium mb-1">시간</label>
								<input
									type="time"
									id="time"
									bind:value={formData.time}
									class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
									required
								/>
							</div>
						</div>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="groomName" class="block text-sm font-medium mb-1">신랑</label>
							<input
								type="text"
								id="groomName"
								bind:value={formData.groomName}
								class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="홍길동"
								required
							/>
						</div>
						<div>
							<label for="brideName" class="block text-sm font-medium mb-1">신부</label>
							<input
								type="text"
								id="brideName"
								bind:value={formData.brideName}
								class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="김영희"
								required
							/>
						</div>
					</div>
					<div>
						<label for="celebrantName" class="block text-sm font-medium mb-1"
							>주례사제 <span class="text-muted-foreground">(선택)</span></label
						>
						<input
							type="text"
							id="celebrantName"
							bind:value={formData.celebrantName}
							class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
							placeholder="김바오로 신부"
						/>
					</div>
				</div>
			</section>

			<!-- 성가 -->
			<section class="bg-card border border-border rounded-lg p-6">
				<h2 class="text-lg font-semibold mb-4 text-foreground">🎵 성가</h2>
				<div class="space-y-4">
					<!-- 입당성가 -->
					<div>
						<label class="block text-sm font-medium mb-2">입당성가</label>
						<div class="grid grid-cols-3 gap-2">
							<input
								type="text"
								bind:value={formData.hymns.entrance.number}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="번호"
							/>
							<input
								type="text"
								bind:value={formData.hymns.entrance.title}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="제목"
							/>
							<input
								type="text"
								bind:value={formData.hymns.entrance.page}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="페이지"
							/>
						</div>
					</div>

					<!-- 화답송 -->
					<div>
						<label class="block text-sm font-medium mb-2">화답송</label>
						<div class="space-y-2">
							<div class="flex gap-4">
								<label class="flex items-center gap-2">
									<input
										type="radio"
										bind:group={formData.hymns.responsorial}
										value="주보 참조"
										class="w-4 h-4"
									/>
									<span class="text-sm">주보 참조</span>
								</label>
								<label class="flex items-center gap-2">
									<input
										type="radio"
										bind:group={formData.hymns.responsorial}
										value="직접 입력"
										class="w-4 h-4"
									/>
									<span class="text-sm">직접 입력</span>
								</label>
								<label class="flex items-center gap-2">
									<input
										type="radio"
										bind:group={formData.hymns.responsorial}
										value="미표시"
										class="w-4 h-4"
									/>
									<span class="text-sm">미표시</span>
								</label>
							</div>
							{#if formData.hymns.responsorial === '직접 입력'}
								<input
									type="text"
									bind:value={formData.hymns.responsorialText}
									class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
									placeholder="화답송 텍스트 입력"
								/>
							{/if}
						</div>
					</div>

					<!-- 봉헌성가 -->
					<div>
						<label class="block text-sm font-medium mb-2">봉헌성가</label>
						<div class="grid grid-cols-3 gap-2">
							<input
								type="text"
								bind:value={formData.hymns.offertory.number}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="번호"
							/>
							<input
								type="text"
								bind:value={formData.hymns.offertory.title}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="제목"
							/>
							<input
								type="text"
								bind:value={formData.hymns.offertory.page}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="페이지"
							/>
						</div>
					</div>

					<!-- 영성체송 (복수 가능) -->
					<div>
						<label class="block text-sm font-medium mb-2"
							>영성체송 <span class="text-muted-foreground text-xs">(복수 가능)</span></label
						>
						<div class="space-y-2">
							{#each formData.hymns.communion as hymn, i}
								<div class="flex gap-2">
									<div class="grid grid-cols-3 gap-2 flex-1">
										<input
											type="text"
											bind:value={hymn.number}
											class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="번호"
										/>
										<input
											type="text"
											bind:value={hymn.title}
											class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="제목"
										/>
										<input
											type="text"
											bind:value={hymn.page}
											class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="페이지"
										/>
									</div>
									{#if formData.hymns.communion.length > 1}
										<button
											type="button"
											onclick={() => removeCommunionHymn(i)}
											class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
										>
											삭제
										</button>
									{/if}
								</div>
							{/each}
							<button
								type="button"
								onclick={addCommunionHymn}
								class="text-sm text-primary hover:underline"
							>
								+ 영성체송 추가
							</button>
						</div>
					</div>

					<!-- 파견성가 -->
					<div>
						<label class="block text-sm font-medium mb-2">파견성가</label>
						<div class="grid grid-cols-3 gap-2">
							<input
								type="text"
								bind:value={formData.hymns.recessional.number}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="번호"
							/>
							<input
								type="text"
								bind:value={formData.hymns.recessional.title}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="제목"
							/>
							<input
								type="text"
								bind:value={formData.hymns.recessional.page}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="페이지"
							/>
						</div>
					</div>

					<!-- 축가 (선택) -->
					<div>
						<label class="block text-sm font-medium mb-2"
							>축가 <span class="text-muted-foreground text-xs">(선택, 비워두면 미표시)</span></label
						>
						<div class="grid grid-cols-3 gap-2">
							<input
								type="text"
								bind:value={formData.hymns.wedding.number}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="번호"
							/>
							<input
								type="text"
								bind:value={formData.hymns.wedding.title}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="제목"
							/>
							<input
								type="text"
								bind:value={formData.hymns.wedding.page}
								class="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="페이지"
							/>
						</div>
					</div>
				</div>
			</section>

			<!-- 전례시기 -->
			<section class="bg-card border border-border rounded-lg p-6">
				<h2 class="text-lg font-semibold mb-4 text-foreground">⛪ 전례시기</h2>
				<div class="space-y-4">
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(liturgicalPresets) as [key, preset]}
							<button
								type="button"
								onclick={() => applyLiturgicalPreset(key as keyof typeof liturgicalPresets)}
								class="px-4 py-2 border rounded-md transition-colors {formData.liturgicalSeason ===
								key
									? 'bg-primary text-primary-foreground border-primary'
									: 'border-border hover:bg-accent'}"
							>
								{preset.label}
							</button>
						{/each}
					</div>
					<div class="border-t border-border pt-4 space-y-3">
						<label class="flex items-center gap-3">
							<input type="checkbox" bind:checked={formData.gloria} class="w-4 h-4" />
							<span class="text-sm">대영광송 포함</span>
						</label>
						<label class="flex items-center gap-3">
							<input type="checkbox" bind:checked={formData.alleluia} class="w-4 h-4" />
							<span class="text-sm">알렐루야 포함</span>
						</label>
					</div>
				</div>
			</section>

			<!-- 테마 -->
			<section class="bg-card border border-border rounded-lg p-6">
				<h2 class="text-lg font-semibold mb-4 text-foreground">🎨 테마</h2>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					{#each [
						{ value: 'ivory-gold', label: 'Ivory Gold' },
						{ value: 'white-rose', label: 'White Rose' },
						{ value: 'cathedral', label: 'Cathedral' },
						{ value: 'sage', label: 'Sage' }
					] as theme}
						<button
							type="button"
							onclick={() => (formData.theme = theme.value as ThemeOption)}
							class="px-4 py-3 border rounded-md transition-colors {formData.theme === theme.value
								? 'bg-primary text-primary-foreground border-primary'
								: 'border-border hover:bg-accent'}"
						>
							{theme.label}
						</button>
					{/each}
				</div>
			</section>

			<!-- 보기 모드 -->
			<section class="bg-card border border-border rounded-lg p-6">
				<h2 class="text-lg font-semibold mb-4 text-foreground">📖 보기 모드</h2>
				<p class="text-sm text-muted-foreground mb-3">하객에게 기본 표시되는 단계 수</p>
				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => (formData.viewMode = 'detailed')}
						class="flex-1 px-4 py-3 border rounded-md transition-colors {formData.viewMode ===
						'detailed'
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border hover:bg-accent'}"
					>
						32단계 (상세)
					</button>
					<button
						type="button"
						onclick={() => (formData.viewMode = 'merged')}
						class="flex-1 px-4 py-3 border rounded-md transition-colors {formData.viewMode ===
						'merged'
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border hover:bg-accent'}"
					>
						18단계 (간결)
					</button>
				</div>
			</section>

			<!-- Submit buttons -->
			<div class="flex gap-3 sticky bottom-0 bg-background py-4 border-t border-border">
				<button
					type="button"
					onclick={handleCancel}
					class="flex-1 px-6 py-3 border border-border rounded-md hover:bg-accent transition-colors"
				>
					취소
				</button>
				<button
					type="submit"
					class="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
				>
					<Save class="w-5 h-5" />
					저장하기
				</button>
			</div>
		</form>
	</main>
</div>
