# Boia FC — app de convocatorias (Android + iOS, gratis)

App instalavel no telemovel (PWA): nao passa por lojas, nao paga contas de developer.
Stack: Next.js (Vercel, gratis) + Supabase (base de dados, login, fotos — gratis) + web push (gratis).

## O que ja esta feito neste pacote
- `supabase/01_schema.sql` — tabelas: players, games, game_guests, attendance, events, notices, notice_targets, push_subscriptions + vista `player_stats`.
- `supabase/02_policies.sql` — permissoes: todos leem, cada um responde pela sua presenca, o capitao gere jogos/golos/jogadores/avisos; bucket `avatars` para fotos.
- `supabase/03_seed.sql` — os 23 jogadores do plantel com os instagrams, 2 jogos de exemplo.
- `app/page.jsx` — a app: login por email, confirmar presenca, calendario, historico, registo de golos/assistencias, rankings, plantel + emprestados, fotos de perfil, avisos (a todos ou individuais).
- `app/api/push/route.js` + `lib/push.js` + `public/sw.js` — notificacoes push.
- `public/manifest.json` — instalacao no ecra inicial.

## A tua lista (por ordem)
1. **Supabase**: cria conta em supabase.com > New project (regiao Frankfurt/London). Guarda a password da base de dados.
2. No painel > **SQL Editor**: cola e corre `supabase/01_schema.sql`, depois `02_policies.sql`, depois `03_seed.sql`.
3. Em `03_seed.sql` confirma a linha que te torna capitao (`update players set is_admin = true where name = 'Jose Pedro';`) — troca pelo teu nome se for outro.
4. Painel > **Project Settings > API**: copia `Project URL`, `anon key` e `service_role key`.
5. **GitHub**: cria repositorio e mete lá esta pasta `boiafc-app`.
6. **Vercel**: cria conta (login com GitHub) > Add New Project > escolhe o repo.
7. Na Vercel > Settings > Environment Variables, mete o que esta em `.env.local.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
8. As chaves de push geras com: `npx web-push generate-vapid-keys` (uma vez, no teu computador).
9. Mete dois ficheiros PNG em `public/`: `icon-192.png` e `icon-512.png` (o emblema do clube, quadrado).
10. Deploy. Ficas com um link tipo `boiafc.vercel.app` — manda ao grupo.
11. Cada jogador: abre o link, poe o email, recebe o link de entrada e escolhe o seu nome da lista (fica associado a ele para sempre).
12. No iPhone: Safari > Partilhar > **Adicionar ao ecra principal** (obrigatorio para as notificacoes funcionarem, iOS 16.4+). No Android o Chrome oferece 'Instalar app'.
13. Dentro da app, em Avisos, cada um toca em **Ligar notificacoes neste telefone** uma vez.

## Correr no teu computador primeiro (opcional)
```
npm install
cp .env.local.example .env.local   # e preenche
npm run dev                        # abre http://localhost:3000
```

## Custos
Tudo em plano gratuito. Limites do free tier do Supabase (500MB de base de dados, 1GB de ficheiros) sao muito acima do que um clube destes gasta.

## Notas honestas
- Passos 5 a 8 exigem alguem minimamente a vontade com codigo (ou o Claude Code com esta pasta).
- Alternativa sem codigo nenhum: Glide sobre um Google Sheets com as mesmas colunas — mais feio, mas montas sozinho numa tarde.
