-- Cada jogador pode mudar a sua propria foto (nao so o admin).
-- So se pode mexer na coluna photo_url, nunca noutras (ex: is_admin),
-- mesmo que o pedido tente enviar mais campos.

create policy own_photo on players for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

revoke update on players from authenticated, anon;
grant update (photo_url) on players to authenticated, anon;
