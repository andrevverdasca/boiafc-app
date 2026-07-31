-- Login por PIN em vez de email. Corre isto no SQL Editor do Supabase
-- depois de 01/02/03 ja terem sido corridos.

alter table players add column if not exists pin_hash text;

-- esconde o hash do PIN de qualquer leitura direta da tabela (so a funcao abaixo lhe mexe)
revoke select on players from authenticated, anon;
grant select (id, name, handle, number, photo_url, is_guest, is_admin, auth_user_id, created_at)
  on players to authenticated, anon;

create or replace function claim_player(p_player_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  select pin_hash into v_hash from players where id = p_player_id for update;
  if v_hash is null then
    update players set pin_hash = crypt(p_pin, gen_salt('bf')), auth_user_id = auth.uid()
    where id = p_player_id;
  else
    if v_hash <> crypt(p_pin, v_hash) then
      raise exception 'pin invalido';
    end if;
    update players set auth_user_id = auth.uid() where id = p_player_id;
  end if;
end;
$$;

grant execute on function claim_player(uuid, text) to authenticated, anon;
