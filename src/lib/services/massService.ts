import { supabase } from './supabase';
import type { MassConfiguration, HymnEntry } from '$lib/types/mass';
import type { Database } from '$lib/types/database';

type MassConfigRow = Database['public']['Tables']['mass_configurations']['Row'];
type MassConfigInsert = Database['public']['Tables']['mass_configurations']['Insert'];
type MassConfigUpdate = Database['public']['Tables']['mass_configurations']['Update'];

/**
 * Mass CRUD Service
 * Supabase와 연동하여 미사 설정을 관리합니다.
 */

/**
 * 새 미사 생성
 */
export async function createMass(data: Partial<MassConfiguration>): Promise<{ data: MassConfiguration | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const insertData: MassConfigInsert = {
      user_id: user.id,
      church_name: data.church_name || '',
      date: data.date || '',
      time: data.time || '',
      groom_name: data.groom_name || '',
      bride_name: data.bride_name || '',
      celebrant_name: data.celebrant_name || null,
      hymns: (data.hymns || {}) as any,
      announcements: (data.announcements || []) as any,
      liturgical_season: data.liturgical_season || 'ordinary',
      gloria_enabled: data.gloria_enabled ?? true,
      alleluia_enabled: data.alleluia_enabled ?? true,
      theme: data.theme || 'ivory-gold',
      view_mode: data.view_mode || 'detailed',
      sync_enabled: data.sync_enabled ?? false,
      current_step: data.current_step || 1,
    };

    const { data: mass, error } = await supabase
      .from('mass_configurations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[massService] Create error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: rowToMassConfig(mass), error: null };
  } catch (err) {
    console.error('[massService] Create exception:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * 미사 ID로 조회
 */
export async function getMass(id: string): Promise<{ data: MassConfiguration | null; error: Error | null }> {
  try {
    const { data: mass, error } = await supabase
      .from('mass_configurations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[massService] Get error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: rowToMassConfig(mass), error: null };
  } catch (err) {
    console.error('[massService] Get exception:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * 현재 사용자의 모든 미사 조회
 */
export async function getUserMasses(): Promise<{ data: MassConfiguration[]; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], error: new Error('User not authenticated') };
    }

    const { data: masses, error } = await supabase
      .from('mass_configurations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[massService] GetUserMasses error:', error);
      return { data: [], error: new Error(error.message) };
    }

    return { data: masses.map(rowToMassConfig), error: null };
  } catch (err) {
    console.error('[massService] GetUserMasses exception:', err);
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * 미사 정보 업데이트
 */
export async function updateMass(id: string, data: Partial<MassConfiguration>): Promise<{ data: MassConfiguration | null; error: Error | null }> {
  try {
    const updateData: MassConfigUpdate = {};

    if (data.church_name !== undefined) updateData.church_name = data.church_name;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.time !== undefined) updateData.time = data.time;
    if (data.groom_name !== undefined) updateData.groom_name = data.groom_name;
    if (data.bride_name !== undefined) updateData.bride_name = data.bride_name;
    if (data.celebrant_name !== undefined) updateData.celebrant_name = data.celebrant_name;
    if (data.hymns !== undefined) updateData.hymns = data.hymns as any;
    if (data.announcements !== undefined) updateData.announcements = data.announcements as any;
    if (data.liturgical_season !== undefined) updateData.liturgical_season = data.liturgical_season;
    if (data.gloria_enabled !== undefined) updateData.gloria_enabled = data.gloria_enabled;
    if (data.alleluia_enabled !== undefined) updateData.alleluia_enabled = data.alleluia_enabled;
    if (data.theme !== undefined) updateData.theme = data.theme;
    if (data.view_mode !== undefined) updateData.view_mode = data.view_mode;
    if (data.sync_enabled !== undefined) updateData.sync_enabled = data.sync_enabled;
    if (data.current_step !== undefined) updateData.current_step = data.current_step;

    const { data: mass, error } = await supabase
      .from('mass_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[massService] Update error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: rowToMassConfig(mass), error: null };
  } catch (err) {
    console.error('[massService] Update exception:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * 미사 삭제
 */
export async function deleteMass(id: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('mass_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[massService] Delete error:', error);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('[massService] Delete exception:', err);
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * DB Row를 MassConfiguration 타입으로 변환
 */
function rowToMassConfig(row: MassConfigRow): MassConfiguration {
  return {
    id: row.id,
    user_id: row.user_id,
    church_name: row.church_name,
    date: row.date,
    time: row.time,
    groom_name: row.groom_name,
    bride_name: row.bride_name,
    celebrant_name: row.celebrant_name || undefined,
    hymns: (row.hymns as unknown as MassConfiguration['hymns']) || {},
    announcements: Array.isArray(row.announcements)
      ? (row.announcements as unknown as MassConfiguration['announcements'])
      : JSON.parse((row.announcements as string) || '[]'),
    liturgical_season: (row.liturgical_season as MassConfiguration['liturgical_season']) || 'ordinary',
    gloria_enabled: row.gloria_enabled,
    alleluia_enabled: row.alleluia_enabled,
    theme: (row.theme as MassConfiguration['theme']) || 'ivory-gold',
    view_mode: (row.view_mode as MassConfiguration['view_mode']) || 'detailed',
    sync_enabled: row.sync_enabled,
    current_step: row.current_step,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
