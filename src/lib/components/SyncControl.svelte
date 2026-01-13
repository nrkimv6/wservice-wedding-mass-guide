<script lang="ts">
	import { Signal, WifiOff, Users } from 'lucide-svelte';

	interface Props {
		syncEnabled: boolean;
		connected: boolean;
		connectedUsers: number;
		onToggle: () => void;
	}

	let { syncEnabled, connected, connectedUsers, onToggle }: Props = $props();
</script>

<div class="bg-card border border-border rounded-lg p-4">
	<div class="flex items-center justify-between gap-4">
		<!-- Left: Sync toggle -->
		<div class="flex items-center gap-3">
			<button
				onclick={onToggle}
				class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {syncEnabled
					? 'bg-green-500'
					: 'bg-gray-300'}"
				aria-label="동기화 토글"
			>
				<span
					class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {syncEnabled
						? 'translate-x-6'
						: 'translate-x-1'}"
				></span>
			</button>

			<div>
				<div class="flex items-center gap-2">
					{#if syncEnabled}
						{#if connected}
							<Signal class="w-4 h-4 text-green-600" />
							<span class="text-sm font-medium text-foreground">동기화 ON</span>
						{:else}
							<WifiOff class="w-4 h-4 text-yellow-600" />
							<span class="text-sm font-medium text-foreground">연결 중...</span>
						{/if}
					{:else}
						<WifiOff class="w-4 h-4 text-muted-foreground" />
						<span class="text-sm font-medium text-muted-foreground">동기화 OFF</span>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground mt-0.5">
					{syncEnabled ? '하객이 자동으로 따라옵니다' : '하객이 자유롭게 탐색합니다'}
				</p>
			</div>
		</div>

		<!-- Right: Connected users count -->
		{#if syncEnabled && connected}
			<div class="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-md">
				<Users class="w-4 h-4 text-green-700" />
				<span class="text-sm font-semibold text-green-900">{connectedUsers}명</span>
			</div>
		{/if}
	</div>

	<!-- Warning for sync mode -->
	{#if syncEnabled}
		<div class="mt-3 pt-3 border-t border-border">
			<p class="text-xs text-muted-foreground">
				⚠️ 동기화 모드에서는 인터넷 연결이 필요합니다. 연결이 끊기면 하객들은 자유 탐색 모드로 전환됩니다.
			</p>
		</div>
	{/if}
</div>
