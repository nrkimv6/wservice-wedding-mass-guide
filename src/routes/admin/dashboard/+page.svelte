<script lang="ts">
	import { Plus, Calendar, Settings, LogOut } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	// Mock data - will be replaced with actual DB data
	const masses = [
		{
			id: 'demo-1',
			date: '2026-02-14',
			time: '14:00',
			churchName: '명동대성당',
			groomName: '홍길동',
			brideName: '김영희',
			isActive: true
		}
	];

	function handleLogout() {
		// TODO: Implement actual logout
		goto('/admin');
	}

	function createNewMass() {
		goto('/admin/mass/new');
	}

	function editMass(massId: string) {
		goto(`/admin/mass/${massId}`);
	}
</script>

<svelte:head>
	<title>대시보드 - 관리자</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="bg-card border-b border-border">
		<div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-foreground">혼배미사 관리</h1>
				<p class="text-sm text-muted-foreground">순서지 설정 및 QR 코드 생성</p>
			</div>
			<button
				onclick={handleLogout}
				class="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<LogOut class="w-4 h-4" />
				로그아웃
			</button>
		</div>
	</header>

	<!-- Main content -->
	<main class="max-w-6xl mx-auto px-4 py-8">
		<!-- Quick actions -->
		<div class="mb-8">
			<button
				onclick={createNewMass}
				class="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
			>
				<Plus class="w-5 h-5" />
				새 미사 만들기
			</button>
		</div>

		<!-- Mass list -->
		<div>
			<h2 class="text-xl font-semibold mb-4 text-foreground">미사 목록</h2>

			{#if masses.length === 0}
				<div class="bg-card border border-border rounded-lg p-8 text-center">
					<Calendar class="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
					<p class="text-muted-foreground mb-4">아직 생성된 미사가 없습니다</p>
					<button
						onclick={createNewMass}
						class="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
					>
						첫 미사 만들기
					</button>
				</div>
			{:else}
				<div class="space-y-4">
					{#each masses as mass}
						<div class="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-3 mb-3">
										<h3 class="text-lg font-semibold text-foreground">
											{mass.groomName} ❤️ {mass.brideName}
										</h3>
										{#if mass.isActive}
											<span
												class="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded"
											>
												활성
											</span>
										{/if}
									</div>

									<div class="space-y-1 text-sm text-muted-foreground">
										<p>
											📅 {new Date(mass.date).toLocaleDateString('ko-KR', {
												year: 'numeric',
												month: 'long',
												day: 'numeric',
												weekday: 'short'
											})}
											{mass.time}
										</p>
										<p>💒 {mass.churchName}</p>
									</div>
								</div>

								<div class="flex gap-2">
									<button
										onclick={() => editMass(mass.id)}
										class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
									>
										<Settings class="w-4 h-4" />
										관리
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Info box -->
		<div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
			<p class="text-sm text-blue-900">
				💡 <strong>안내:</strong> 미사 데이터는 익일 자동 삭제됩니다. 미사가 끝난 후에는 QR 코드가
				작동하지 않습니다.
			</p>
		</div>
	</main>
</div>
