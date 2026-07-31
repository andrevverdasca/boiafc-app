-- Boia FC · esquema completo. Cola isto no SQL Editor do Supabase e corre.
create extension if not exists pgcrypto;

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text,
  number int,
  photo_url text,
  is_guest boolean not null default false,
  is_admin boolean not null default false,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  opponent text not null,
  kickoff timestamptz not null,
  field text not null,
  format text not null default 'Futebol 7',
  goals_for int,
  goals_against int,
  created_at timestamptz not null default now()
);

-- emprestados convocados para jogos concretos
create table if not exists game_guests (
  game_id uuid references games(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  primary key (game_id, player_id)
);

create table if not exists attendance (
  game_id uuid references games(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  status text not null check (status in ('vou','talvez','nao')),
  updated_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  kind text not null check (kind in ('golo','assist')),
  created_at timestamptz not null default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text not null,
  audience_all boolean not null default true,
  created_by uuid references players(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists notice_targets (
  notice_id uuid references notices(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  read_at timestamptz,
  primary key (notice_id, player_id)
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- vista de estatisticas: golos, assistencias e jogos por jogador
create or replace view player_stats as
select p.id, p.name, p.handle, p.number, p.photo_url, p.is_guest,
  count(*) filter (where e.kind = 'golo') as goals,
  count(*) filter (where e.kind = 'assist') as assists,
  count(distinct a.game_id) filter (where a.status = 'vou') as played
from players p
left join events e on e.player_id = p.id
left join attendance a on a.player_id = p.id
group by p.id;
