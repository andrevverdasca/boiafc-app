-- So precisas de correr isto se ja tinhas corrido a versao anterior
-- de 04_pin_login.sql (a que pedia PIN). Remove o PIN, volta a deixar
-- a tabela players com leitura normal, e simplifica o login para
-- "escolher o nome e entra".

drop function if exists claim_player(uuid, text);

create or replace function claim_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update players set auth_user_id = auth.uid() where id = p_player_id;
end;
$$;

grant execute on function claim_player(uuid) to authenticated, anon;

revoke select on players from authenticated, anon;
grant select on players to authenticated, anon;

alter table players drop column if exists pin_hash;
