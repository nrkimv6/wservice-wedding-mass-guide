<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/services/supabase';

  let status = $state<'loading' | 'success' | 'error'>('loading');
  let errorMessage = $state('');

  onMount(async () => {
    try {
      // URL에서 토큰 파싱
      const searchParams = new URLSearchParams(window.location.search);
      const provider = searchParams.get('provider');
      const idToken = searchParams.get('id_token');
      const accessToken = searchParams.get('access_token');
      const supabaseAccessToken = searchParams.get('supabase_access_token');
      const supabaseRefreshToken = searchParams.get('supabase_refresh_token');
      const returnTo = searchParams.get('returnTo') || '/admin';
      const error = searchParams.get('error');

      // 에러 체크
      if (error) {
        throw new Error(error);
      }

      // Kakao: setSession 사용 (Worker에서 세션 생성됨)
      if (supabaseAccessToken && supabaseRefreshToken) {
        console.log('[Auth Callback] Using Supabase tokens (Kakao)');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: supabaseAccessToken,
          refresh_token: supabaseRefreshToken
        });

        if (sessionError) throw sessionError;
      }
      // Google: signInWithIdToken 사용
      else if (provider === 'google' && idToken && accessToken) {
        console.log('[Auth Callback] Using signInWithIdToken (Google)');
        const { error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
          access_token: accessToken
        });

        if (signInError) throw signInError;
      }
      else {
        throw new Error('Invalid callback parameters');
      }

      status = 'success';

      // 잠시 후 원래 페이지로 이동
      setTimeout(() => {
        goto(returnTo, { replaceState: true });
      }, 500);

    } catch (err) {
      status = 'error';
      errorMessage = err instanceof Error ? err.message : 'Login failed';
      console.error('Auth callback error:', err);
    }
  });
</script>

<div class="flex flex-col items-center justify-center min-h-screen bg-background">
  {#if status === 'loading'}
    <div class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
    <p class="mt-4 text-gray-600">로그인 처리 중...</p>
  {:else if status === 'success'}
    <div class="text-green-500 text-5xl">✓</div>
    <p class="mt-4 text-gray-600">로그인 완료! 이동 중...</p>
  {:else if status === 'error'}
    <div class="text-red-500 text-5xl">✗</div>
    <p class="mt-4 text-red-600">{errorMessage}</p>
    <button
      onclick={() => goto('/login')}
      class="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
    >
      다시 시도
    </button>
  {/if}
</div>
