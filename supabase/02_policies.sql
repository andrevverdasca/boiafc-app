-- Regras de acesso (RLS). Corre depois do 01_schema.sql.
create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from players where auth_user_id = auth.uid() and is_admin);
$$;

create or replace function my_player_id() returns uuid language sql stable as $$
  select id from players where auth_user_id = auth.uid() limit 1;
$$;

alter table players enable row level security;
alter table games enable row level security;
alter table game_guests enable row level security;
alter table attendance enable row level security;
alter table events enable row level security;
alter table notices enable row level security;
alter table notice_targets enable row level security;
alter table push_subscriptions enable row level security;

-- todos os jogadores autenticados leem tudo
create policy read_players on players for select to authenticated using (true);
create policy read_games on games for select to authenticated using (true);
create policy read_guests on game_guests for select to authenticated using (true);
create policy read_attendance on attendance for select to authenticated using (true);
create policy read_events on events for select to authenticated using (true);
create policy read_notices on notices for select to authenticated using (true);
create policy read_targets on notice_targets for select to authenticated using (true);

-- cada um responde pela sua presenca
create policy own_attendance_insert on attendance for insert to authenticated
  with check (player_id = my_player_id() or is_admin());
create policy own_attendance_update on attendance for update to authenticated
  using (player_id = my_player_id() or is_admin());

-- o capitao gere jogos, jogadores, golos e avisos
create policy admin_games on games for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_guests on game_guests for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_events on events for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_players on players for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_notices on notices for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_targets on notice_targets for all to authenticated using (is_admin() or player_id = my_player_id()) with check (is_admin() or player_id = my_player_id());
create policy own_push on push_subscriptions for all to authenticated using (player_id = my_player_id()) with check (player_id = my_player_id());

-- bucket publico para fotos de perfil
insert into storage.buckets (id, name, public) values ('avatars','avatars',true) on conflict do nothing;
create policy avatars_read on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_write on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
create policy avatars_update on storage.objects for update to authenticated using (bucket_id = 'avatars');
