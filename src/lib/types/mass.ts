// Mass configuration types

export interface HymnEntry {
  number: string;
  title: string;
  page: string;
}

export interface MassConfiguration {
  id: string;
  user_id: string;

  // 상세정보
  church_name: string;
  date: string;
  time: string;
  groom_name: string;
  bride_name: string;
  celebrant_name?: string;

  // 성가 (JSONB)
  hymns: {
    entrance?: HymnEntry;
    responsorial?: string | null;
    offertory?: HymnEntry;
    communion?: HymnEntry[];
    recessional?: HymnEntry;
    wedding?: HymnEntry;
  };

  // 전례시기
  liturgical_season: 'ordinary' | 'advent' | 'lent' | 'easter';
  gloria_enabled: boolean;
  alleluia_enabled: boolean;

  // 설정
  theme: 'ivory-gold' | 'white-rose' | 'cathedral' | 'sage';
  view_mode: 'detailed' | 'merged';

  // 실시간 동기화
  sync_enabled: boolean;
  current_step: number;

  created_at: string;
  updated_at: string;
}

// 전례시기별 기본값
export const LITURGICAL_PRESETS = {
  ordinary: { gloria: true, alleluia: true },
  advent: { gloria: false, alleluia: true },
  lent: { gloria: false, alleluia: false },
  easter: { gloria: true, alleluia: true },
} as const;

// 새 미사 생성 시 기본값
export const DEFAULT_MASS_CONFIG: Partial<MassConfiguration> = {
  hymns: {},
  liturgical_season: 'ordinary',
  gloria_enabled: true,
  alleluia_enabled: true,
  theme: 'ivory-gold',
  view_mode: 'detailed',
  sync_enabled: false,
  current_step: 1,
};
