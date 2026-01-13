<script lang="ts">
	import { onMount } from 'svelte';
	import { BarChart3, Users, Eye, Clock } from 'lucide-svelte';
	import { getMassAnalyticsSummary } from '$lib/services/analyticsService';

	interface Props {
		massId: string;
	}

	let { massId }: Props = $props();

	let loading = $state(true);
	let error = $state('');
	let analytics = $state({
		totalVisitors: 0,
		totalVisits: 0,
		uniqueVisitors: 0,
		firstVisit: null as string | null,
		lastVisit: null as string | null
	});

	onMount(async () => {
		const result = await getMassAnalyticsSummary(massId);

		if (result.error) {
			error = result.error.message;
		} else {
			analytics = {
				totalVisitors: result.totalVisitors,
				totalVisits: result.totalVisits,
				uniqueVisitors: result.uniqueVisitors,
				firstVisit: result.firstVisit || null,
				lastVisit: result.lastVisit || null
			};
		}

		loading = false;
	});

	// Format date helper
	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		return date.toLocaleString('ko-KR', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="bg-card border border-border rounded-lg p-6">
	<div class="flex items-center gap-2 mb-4">
		<BarChart3 class="w-6 h-6 text-primary" />
		<h2 class="text-xl font-semibold text-foreground">접속 통계</h2>
		<span class="text-xs text-muted-foreground ml-auto">(관리자 전용)</span>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div
				class="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"
			></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
			통계를 불러오는 중 오류가 발생했습니다: {error}
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4">
			<!-- Total Visitors -->
			<div class="bg-muted rounded-lg p-4">
				<div class="flex items-center gap-2 mb-2">
					<Users class="w-5 h-5 text-primary" />
					<span class="text-sm text-muted-foreground">총 방문자</span>
				</div>
				<p class="text-2xl font-bold text-foreground">{analytics.totalVisitors}</p>
			</div>

			<!-- Total Visits -->
			<div class="bg-muted rounded-lg p-4">
				<div class="flex items-center gap-2 mb-2">
					<Eye class="w-5 h-5 text-primary" />
					<span class="text-sm text-muted-foreground">총 방문 횟수</span>
				</div>
				<p class="text-2xl font-bold text-foreground">{analytics.totalVisits}</p>
			</div>

			<!-- First Visit -->
			<div class="bg-muted rounded-lg p-4">
				<div class="flex items-center gap-2 mb-2">
					<Clock class="w-5 h-5 text-primary" />
					<span class="text-sm text-muted-foreground">첫 방문</span>
				</div>
				<p class="text-sm font-medium text-foreground">{formatDate(analytics.firstVisit)}</p>
			</div>

			<!-- Last Visit -->
			<div class="bg-muted rounded-lg p-4">
				<div class="flex items-center gap-2 mb-2">
					<Clock class="w-5 h-5 text-primary" />
					<span class="text-sm text-muted-foreground">최근 방문</span>
				</div>
				<p class="text-sm font-medium text-foreground">{formatDate(analytics.lastVisit)}</p>
			</div>
		</div>

		<p class="text-xs text-muted-foreground mt-4">
			💡 익명 방문자 ID를 기준으로 집계됩니다. 실시간 업데이트는 되지 않으며, 새로고침이 필요합니다.
		</p>
	{/if}
</div>
