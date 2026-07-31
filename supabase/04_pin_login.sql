-- Login simples: escolher o nome da lista, sem password nem email.
-- Corre isto no SQL Editor do Supabase depois de 01/02/03 ja terem sido corridos.

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
