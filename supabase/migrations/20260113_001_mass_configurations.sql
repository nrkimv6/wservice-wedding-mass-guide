-- 혼배미사 설정 테이블
-- 생성일: 2026-01-13

-- mass_configurations 테이블
create table if not exists mass_configurations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  -- 상세정보
  church_name text not null,
  date date not null,
  time time not null,
  groom_name text not null,
  bride_name text not null,
  celebrant_name text,

  -- 성가 (JSONB)
  -- {
  --   entrance: { number: "152", title: "다함께 노래해", page: "87" },
  --   responsorial: "주보 참조" | null,
  --   offertory: { number: "234", title: "주님께 드리는", page: "142" },
  --   communion: [{ number: "312", title: "생명의 빵", page: "189" }],
  --   recessional: { number: "401", title: "기쁜 소식", page: "231" },
  --   wedding: { number: "500", title: "축가", page: "280" } | null
  -- }
  hymns jsonb default '{}',

  -- 전례시기
  liturgical_season text default 'ordinary', -- ordinary, advent, lent, easter
  gloria_enabled boolean default true,
  alleluia_enabled boolean default true,

  -- 설정
  theme text default 'ivory-gold',
  view_mode text default 'detailed', -- detailed(32단계), merged(18단계)

  -- 실시간 동기화
  sync_enabled boolean default false,
  current_step integer default 1,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS 정책 활성화
alter table mass_configurations enable row level security;

-- Users can CRUD own masses
create policy "Users can CRUD own masses"
  on mass_configurations for all
  using (auth.uid() = user_id);

-- Anyone can read active masses (하객은 읽기만 가능)
create policy "Anyone can read active masses"
  on mass_configurations for select
  using (true);

-- updated_at 자동 갱신 함수
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- updated_at 트리거
create trigger update_mass_configurations_updated_at
  before update on mass_configurations
  for each row execute function update_updated_at_column();

-- 인덱스
create index if not exists idx_mass_configurations_user_id on mass_configurations(user_id);
create index if not exists idx_mass_configurations_date on mass_configurations(date);
create index if not exists idx_mass_configurations_created_at on mass_configurations(created_at desc);
