<script lang="ts">
  import { AUTH_WORKER_URL, APP_ID } from '$lib/config';

  let signingIn = $state(false);

  function handleKakaoLogin() {
    if (signingIn) return;

    signingIn = true;
    const returnTo = window.location.pathname;

    window.location.href =
      `${AUTH_WORKER_URL}/kakao?appId=${APP_ID}&returnTo=${encodeURIComponent(returnTo)}`;
  }
</script>

<button
  onclick={handleKakaoLogin}
  disabled={signingIn}
  class="flex items-center gap-2 px-6 py-3 bg-[#FEE500] text-[#191919] rounded-lg hover:bg-[#FADA0A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.89 5.32 4.72 6.73-.17.6-.63 2.16-.72 2.5-.11.41.15.4.32.29.13-.08 2.07-1.4 2.93-1.98.9.14 1.83.21 2.75.21 5.52 0 10-3.58 10-8S17.52 3 12 3z"/>
  </svg>
  <span class="font-medium">
    {signingIn ? '로그인 중...' : '카카오로 로그인'}
  </span>
</button>
