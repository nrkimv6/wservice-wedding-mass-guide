<script lang="ts">
	import { Signal, WifiOff } from 'lucide-svelte';

	interface Props {
		connected: boolean;
		syncing: boolean;
		error: string | null;
		onDisableSync?: () => void;
	}

	let { connected, syncing, error, onDisableSync }: Props = $props();
</script>

{#if syncing}
	<div class="bg-green-100 border-b border-green-200 px-4 py-3">
		<div class="max-w-[600px] mx-auto flex items-center justify-between gap-3">
			<div class="flex items-center gap-2 flex-1">
				{#if connected}
					<Signal class="w-4 h-4 text-green-700 animate-pulse" />
					<span class="text-sm text-green-900 font-medium">
						🔴 관리자와 동기화 중
					</span>
				{:else if error}
					<WifiOff class="w-4 h-4 text-red-700" />
					<span class="text-sm text-red-900 font-medium">
						⚠️ 연결이 끊겼습니다
					</span>
				{:else}
					<Signal class="w-4 h-4 text-yellow-700 animate-pulse" />
					<span class="text-sm text-yellow-900 font-medium">
						연결 중...
					</span>
				{/if}
			</div>

			{#if onDisableSync}
				<button
					onclick={onDisableSync}
					class="text-xs text-green-800 hover:text-green-950 underline whitespace-nowrap"
				>
					자유 탐색 모드
				</button>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
			<div class="max-w-[600px] mx-auto">
				<p class="text-xs text-yellow-800">
					연결이 복구되면 자동으로 다시 동기화됩니다.
				</p>
			</div>
		</div>
	{/if}
{/if}
