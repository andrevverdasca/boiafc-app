-- Cor do equipamento (preto ou laranja) para cada jogo.
alter table games add column if not exists kit_color text check (kit_color in ('preto','laranja'));
