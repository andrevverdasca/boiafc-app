-- Plantel do Boia FC + dois jogos de exemplo. Corre por ultimo.
insert into players (name, handle, number) values
  ('José Pedro', '@jose.pedro23', 23),
  ('Bastos', '@joaobastosc21', 21),
  ('Pedro Silva', '@pedro_silva12_', 12),
  ('João Neves', '@joaoneves_14', 14),
  ('Miguel Silva', '@mnsilva.19', 19),
  ('Miguel Torrão', '@migueltorrao_', 3),
  ('Tiago Charrua', '@tiagocharrua_', 5),
  ('Ricardo Neves', '@ricardo.neves___', 6),
  ('Diogo Ferreira', '@dfferreira8', 8),
  ('João Augusto', '@joaopm_augusto', 11),
  ('Artur M. F. Neves', '@artur.neves.10', 10),
  ('André Verdasca', '@andreverdasca', 13),
  ('Matheus Fonseca', '@_matthaus17', 17),
  ('Pedro Salvador', '@_pedro_salvador', 15),
  ('Henrique Anacleto', '@henriquem_14', 44),
  ('Jorge Salsess', '@jorgesalsess', 18),
  ('Zé', '@jose_bombaca', 20),
  ('Lucas Nonato', '@lucasqnonato', 22),
  ('João Pinto', '@joaogbpinto', 24),
  ('Tiago Filipe', '@tiago.s.filipe', 25),
  ('José Barros', '@zebarros07', 7),
  ('Francisco Curtinhal', '@fmcurtinhal16', 16),
  ('Curtinhal', '@m.curtinhal', 2);

-- torna-te capitao (troca pelo teu nome exato)
update players set is_admin = true where name = 'José Pedro';

insert into games (opponent, kickoff, field, format) values
  ('FC Sem Fôlego', now() + interval '3 days', 'EveryBoia', 'Futebol 7'),
  ('Os Canelas', now() + interval '6 days', 'CES', 'Futsal 5');
