import { supabase } from '$lib/services/supabase';
import { AUTH_WORKER_URL, APP_ID } from '$lib/config';
import type { User } from '@supabase/supabase-js';
import { realtimeSyncStore } from './realtimeSync.svelte';
import { wakeLockStore } from './wakeLock.svelte';

class AuthStore {
  user = $state<User | null>(null);
  loading = $state(true);
  initialized = $state(false);

  async initialize() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      this.user = session?.user ?? null;

      // 세션 변경 감지
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          // Realtime 연결 및 Wake Lock 해제
          realtimeSyncStore.disconnect();
          wakeLockStore.disable();
          this.user = null;
        } else {
          this.user = session?.user ?? null;
        }
      });
    } finally {
      this.loading = false;
      this.initialized = true;
    }
  }

  get isLoggedIn() {
    return !!this.user;
  }

  signInWithGoogle(returnTo?: string) {
    const path = returnTo ?? window.location.pathname;
    window.location.href =
      `${AUTH_WORKER_URL}/google?appId=${APP_ID}&returnTo=${encodeURIComponent(path)}`;
  }

  signInWithKakao(returnTo?: string) {
    const path = returnTo ?? window.location.pathname;
    window.location.href =
      `${AUTH_WORKER_URL}/kakao?appId=${APP_ID}&returnTo=${encodeURIComponent(path)}`;
  }

  async signOut() {
    await supabase.auth.signOut();
    this.user = null;
  }
}

export const authStore = new AuthStore();
