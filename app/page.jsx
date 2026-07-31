'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { enablePush } from '../lib/push';

const RED = '#e8443f', GOLD = '#f0b429', GREEN = '#7fd6a4';
const FUT5_FIELDS = ['CES', 'Frei Aleixo'];
const FIELDS = ['EveryBoia', 'SLE', 'Complexo', 'CES', 'Frei Aleixo'];
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const STATUS = {
  vou: { label: 'Vou', fg: GREEN, bg: 'rgba(63,122,90,.22)' },
  talvez: { label: 'Talvez', fg: GOLD, bg: 'rgba(240,180,41,.18)' },
  nao: { label: 'Nao vou', fg: '#ff7b74', bg: 'rgba(232,68,63,.18)' },
  sem: { label: 'Sem resposta', fg: 'rgba(244,241,234,.4)', bg: 'rgba(244,241,234,.06)' }
};
const card = { background: '#151b26', border: '1px solid rgba(244,241,234,.07)', borderRadius: 18, padding: 14 };
const label = { font: '700 11px/1 Archivo, sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,241,234,.45)' };
const input = { width: '100%', padding: 14, borderRadius: 14, background: '#0d1119', border: '1px solid rgba(244,241,234,.1)', color: '#f4f1ea', font: '600 15px Archivo, sans-serif', outline: 'none', boxSizing: 'border-box' };
const btn = (on) => ({ padding: '12px 16px', borderRadius: 14, background: on ? RED : '#0d1119', color: on ? '#fff' : 'rgba(244,241,234,.55)', font: '700 12px Archivo, sans-serif', border: 'none', cursor: 'pointer' });

function initials(name) {
  const p = String(name || '?').trim().split(' ');
  return ((p[0][0] || '') + (p[1] ? p[1][0] : (p[0][1] || ''))).toUpperCase();
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' · ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

export default function Page() {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [guests, setGuests] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [tab, setTab] = useState('inicio');
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession(data.session);
      else supabase.auth.signInAnonymously().then(({ data: d2 }) => setSession(d2.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadAll() {
    const [p, g, gg, a, e, n] = await Promise.all([
      supabase.from('players').select('id,name,handle,number,photo_url,is_guest,is_admin,auth_user_id,created_at').order('number'),
      supabase.from('games').select('*').order('kickoff'),
      supabase.from('game_guests').select('*'),
      supabase.from('attendance').select('*'),
      supabase.from('events').select('*'),
      supabase.from('notices').select('*').order('created_at', { ascending: false })
    ]);
    setPlayers(p.data || []); setGames(g.data || []); setGuests(gg.data || []);
    setAttendance(a.data || []); setEvents(e.data || []); setNotices(n.data || []);
    if (session) {
      const mine = (p.data || []).find(x => x.auth_user_id === session.user.id);
      setMe(mine || null);
    }
    setLoading(false);
  }
  useEffect(() => { if (session) loadAll(); }, [session]);

  const now = Date.now();
  const upcoming = games.filter(g => new Date(g.kickoff).getTime() >= now);
  const past = games.filter(g => new Date(g.kickoff).getTime() < now).slice().reverse();
  const next = upcoming[0];
  const isAdmin = !!(me && me.is_admin);

  function rosterFor(gameId) {
    const club = players.filter(p => !p.is_guest);
    const gs = guests.filter(x => x.game_id === gameId).map(x => x.player_id);
    return club.concat(players.filter(p => p.is_guest && gs.indexOf(p.id) >= 0));
  }
  function statusOf(gameId, playerId) {
    const row = attendance.find(a => a.game_id === gameId && a.player_id === playerId);
    return row ? row.status : 'sem';
  }
  async function setStatus(gameId, status) {
    if (!me) return;
    await supabase.from('attendance').upsert({ game_id: gameId, player_id: me.id, status, updated_at: new Date().toISOString() }, { onConflict: 'game_id,player_id' });
    loadAll();
  }
  function statsOf(playerId) {
    const mine = events.filter(e => e.player_id === playerId);
    return {
      goals: mine.filter(e => e.kind === 'golo').length,
      assists: mine.filter(e => e.kind === 'assist').length,
      played: attendance.filter(a => a.player_id === playerId && a.status === 'vou').length
    };
  }
  async function addEvent(gameId, playerId, kind) {
    await supabase.from('events').insert({ game_id: gameId, player_id: playerId, kind });
    loadAll();
  }
  async function removeEvent(gameId, playerId, kind) {
    const hit = events.filter(e => e.game_id === gameId && e.player_id === playerId && e.kind === kind)[0];
    if (hit) { await supabase.from('events').delete().eq('id', hit.id); loadAll(); }
  }
  async function sendNotice(title, body, playerIds) {
    const { data } = await supabase.from('notices').insert({ title, body, audience_all: !playerIds.length, created_by: me ? me.id : null }).select().single();
    if (data && playerIds.length) {
      await supabase.from('notice_targets').insert(playerIds.map(id => ({ notice_id: data.id, player_id: id })));
    }
    await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title || 'Boia FC', body, playerIds }) });
    loadAll();
  }

  if (!session || loading) return <div style={{ padding: 40 }}>A carregar…</div>;
  if (!me) return <Claim players={players} onDone={loadAll} />;

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', paddingBottom: 96 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 16px' }}>
        <div style={{ font: '800 13px/1 Archivo, sans-serif', letterSpacing: '.14em', textTransform: 'uppercase' }}>Boia FC</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setSheet({ kind: 'notices' })} style={{ ...btn(false), padding: '8px 12px' }}>Avisos ({notices.length})</button>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 12px Archivo' }}>{initials(me.name)}</div>
        </div>
      </header>

      {tab === 'inicio' && next && (
        <section style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, background: 'linear-gradient(150deg,' + RED + ',#6d1218)' }}>
            <div style={{ ...label, color: 'rgba(255,255,255,.8)' }}>Proximo jogo</div>
            <div style={{ font: '400 40px/1 Anton, sans-serif', textTransform: 'uppercase', margin: '10px 0' }}>{next.opponent}</div>
            <div style={{ font: '600 13px Archivo' }}>{fmtDate(next.kickoff)} · {next.field} · {next.format}</div>
          </div>
          <div style={card}>
            <div style={label}>Vais?</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {['vou','talvez','nao'].map(k => (
                <button key={k} onClick={() => setStatus(next.id, k)} style={{ ...btn(statusOf(next.id, me.id) === k), flex: 1 }}>{STATUS[k].label}</button>
              ))}
            </div>
          </div>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={label}>Convocatoria</div>
            {rosterFor(next.id).map(p => {
              const s = STATUS[statusOf(next.id, p.id)];
              return (
                <div key={p.id} onClick={() => setSheet({ kind: 'player', id: p.id })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
                  <Avatar player={p} />
                  <div style={{ flex: 1, font: '600 14px Archivo' }}>{p.name}{p.is_guest ? ' · emprestado' : ''}</div>
                  <div style={{ font: '700 10px Archivo', color: s.fg, textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'jogos' && (
        <section style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={label}>Calendario</div>
            {isAdmin && <button onClick={() => setSheet({ kind: 'newGame' })} style={btn(true)}>+ Marcar jogo</button>}
          </div>
          {upcoming.map(g => (
            <div key={g.id} style={card}>
              <div style={{ font: '700 15px Archivo' }}>{g.opponent}</div>
              <div style={{ font: '400 11px Archivo', color: 'rgba(244,241,234,.4)', marginTop: 4 }}>{fmtDate(g.kickoff)} · {g.field} · {g.format}</div>
              <div style={{ font: '600 11px Archivo', color: GREEN, marginTop: 6 }}>
                {attendance.filter(a => a.game_id === g.id && a.status === 'vou').length} confirmados
              </div>
            </div>
          ))}
          <div style={{ ...label, marginTop: 14 }}>Historico</div>
          {past.map(g => (
            <div key={g.id} onClick={() => setSheet({ kind: 'game', id: g.id })} style={{ ...card, cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ font: '400 22px Anton' }}>{(g.goals_for ?? '-') + '-' + (g.goals_against ?? '-')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: '600 14px Archivo' }}>{g.opponent}</div>
                  <div style={{ font: '400 11px Archivo', color: 'rgba(244,241,234,.4)' }}>{fmtDate(g.kickoff)} · {g.field}</div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'stats' && <Rankings players={players} statsOf={statsOf} onPick={id => setSheet({ kind: 'player', id })} />}

      {tab === 'plantel' && (
        <Squad players={players} games={games} guests={guests} isAdmin={isAdmin}
          onPick={id => setSheet({ kind: 'player', id })}
          onAdd={() => setSheet({ kind: 'newPlayer' })} />
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', gap: 4, padding: '10px 12px 26px', background: '#0d1119', maxWidth: 460, margin: '0 auto' }}>
        {[['inicio','Inicio'],['jogos','Jogos'],['stats','Rankings'],['plantel','Plantel']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...btn(tab === k), flex: 1 }}>{l}</button>
        ))}
      </nav>

      {sheet && (
        <Sheet onClose={() => setSheet(null)}>
          {sheet.kind === 'notices' && <Notices notices={notices} players={players} isAdmin={isAdmin} me={me} onSend={sendNotice} />}
          {sheet.kind === 'newGame' && <NewGame onDone={() => { setSheet(null); loadAll(); }} />}
          {sheet.kind === 'newPlayer' && <NewPlayer games={games} onDone={() => { setSheet(null); loadAll(); }} />}
          {sheet.kind === 'game' && <GameSheet game={games.find(g => g.id === sheet.id)} players={players} events={events} isAdmin={isAdmin} onAdd={addEvent} onRemove={removeEvent} onSaveScore={loadAll} />}
          {sheet.kind === 'player' && <PlayerSheet player={players.find(p => p.id === sheet.id)} stats={statsOf(sheet.id)} games={games} guests={guests} isAdmin={isAdmin} onChanged={loadAll} onMessage={(t,b,ids) => sendNotice(t,b,ids)} />}
        </Sheet>
      )}
    </div>
  );
}

function Avatar({ player, size = 32 }) {
  const st = { width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 };
  if (player && player.photo_url) return <img src={player.photo_url} alt="" style={st} />;
  return <div style={{ ...st, background: '#2f6f8f', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 11px Archivo' }}>{initials(player && player.name)}</div>;
}

function Claim({ players, onDone }) {
  const [picked, setPicked] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const sorted = players.slice().sort((a, b) => a.name.localeCompare(b.name));

  async function submit() {
    setError('');
    if (pin.length < 4) { setError('O PIN tem de ter pelo menos 4 numeros.'); return; }
    const { error } = await supabase.rpc('claim_player', { p_player_id: picked.id, p_pin: pin });
    if (error) { setError('PIN errado.'); return; }
    onDone();
  }

  if (picked) {
    return (
      <div style={{ maxWidth: 380, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ font: '400 34px/1 Anton', textTransform: 'uppercase' }}>Boia FC</div>
        <div style={{ font: '400 13px/1.5 Archivo', color: 'rgba(244,241,234,.5)' }}>
          {picked.pin_hash ? `Introduz o PIN de ${picked.name}.` : `Define um PIN para ${picked.name} (fica associado a ti para sempre).`}
        </div>
        <input style={input} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} placeholder="PIN" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setPicked(null); setPin(''); setError(''); }} style={btn(false)}>Voltar</button>
          <button onClick={submit} style={btn(true)}>{picked.pin_hash ? 'Entrar' : 'Criar PIN'}</button>
        </div>
        {error && <div style={{ font: '600 12px Archivo', color: '#ff7b74' }}>{error}</div>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
      <div style={{ font: '400 34px/1 Anton', textTransform: 'uppercase', marginBottom: 12 }}>Boia FC</div>
      <div style={{ ...label, marginBottom: 12 }}>Quem es tu?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map(p => (
          <button key={p.id} onClick={() => setPicked(p)} style={{ ...btn(false), textAlign: 'left' }}>{p.name} · {p.handle}</button>
        ))}
      </div>
    </div>
  );
}

function Sheet({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,11,.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto', background: '#111721', borderRadius: '24px 24px 0 0', padding: 18 }}>
        {children}
        <button onClick={onClose} style={{ ...btn(false), width: '100%', marginTop: 16 }}>Fechar</button>
      </div>
    </div>
  );
}

function Notices({ notices, players, isAdmin, me, onSend }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [to, setTo] = useState([]);
  const [pushState, setPushState] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ font: '400 26px Anton', textTransform: 'uppercase' }}>Avisos</div>
      <button onClick={async () => setPushState(await enablePush(me.id))} style={btn(false)}>
        {pushState === 'ativo' ? 'Notificacoes ligadas' : 'Ligar notificacoes neste telefone'}
      </button>
      {notices.map(n => (
        <div key={n.id} style={card}>
          <div style={{ font: '700 13px Archivo' }}>{n.title || 'Aviso'}</div>
          <div style={{ font: '400 12px/1.5 Archivo', color: 'rgba(244,241,234,.5)', marginTop: 4 }}>{n.body}</div>
          <div style={{ font: '600 10px Archivo', color: n.audience_all ? 'rgba(244,241,234,.3)' : GOLD, marginTop: 6 }}>
            {n.audience_all ? 'Para todos' : 'Mensagem individual'}
          </div>
        </div>
      ))}
      {isAdmin && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={label}>Enviar aviso</div>
          <input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Titulo" />
          <textarea style={{ ...input, height: 90, resize: 'none', font: '400 14px/1.5 Archivo' }} value={body} onChange={e => setBody(e.target.value)} placeholder="Mensagem" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {players.map(p => {
              const on = to.indexOf(p.id) >= 0;
              return <button key={p.id} onClick={() => setTo(on ? to.filter(x => x !== p.id) : to.concat([p.id]))} style={{ ...btn(on), padding: '8px 10px', font: '600 11px Archivo' }}>{p.name.split(' ')[0]}</button>;
            })}
          </div>
          <button onClick={() => { onSend(title, body, to); setTitle(''); setBody(''); setTo([]); }} style={btn(true)}>
            {to.length ? 'Enviar a ' + to.length + ' jogador(es)' : 'Enviar a todos'}
          </button>
        </div>
      )}
    </div>
  );
}

function NewGame({ onDone }) {
  const [opp, setOpp] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:30');
  const [field, setField] = useState('EveryBoia');
  const format = FUT5_FIELDS.indexOf(field) >= 0 ? 'Futsal 5' : 'Futebol 7';
  async function save() {
    if (!opp || !date) return;
    await supabase.from('games').insert({ opponent: opp, kickoff: new Date(date + 'T' + time).toISOString(), field, format });
    onDone();
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ font: '400 26px Anton', textTransform: 'uppercase' }}>Marcar jogo</div>
      <input style={input} value={opp} onChange={e => setOpp(e.target.value)} placeholder="Adversario" />
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input style={input} type="time" value={time} onChange={e => setTime(e.target.value)} />
      </div>
      <select style={{ ...input, cursor: 'pointer' }} value={field} onChange={e => setField(e.target.value)}>
        {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <div style={{ font: '400 12px Archivo', color: 'rgba(244,241,234,.4)' }}>Formato automatico: {format}</div>
      <button onClick={save} style={btn(true)}>Guardar jogo</button>
    </div>
  );
}

function NewPlayer({ games, onDone }) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [number, setNumber] = useState('');
  const [guest, setGuest] = useState(false);
  const [gameId, setGameId] = useState(games[0] ? games[0].id : '');
  async function save() {
    if (!name) return;
    const { data } = await supabase.from('players').insert({ name, handle, number: parseInt(number, 10) || null, is_guest: guest }).select('id,name,handle,number,photo_url,is_guest,is_admin,auth_user_id,created_at').single();
    if (guest && data && gameId) await supabase.from('game_guests').insert({ game_id: gameId, player_id: data.id });
    onDone();
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ font: '400 26px Anton', textTransform: 'uppercase' }}>Adicionar jogador</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setGuest(false)} style={{ ...btn(!guest), flex: 1 }}>Do clube</button>
        <button onClick={() => setGuest(true)} style={{ ...btn(guest), flex: 1 }}>Emprestado</button>
      </div>
      <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="Nome" />
      <input style={input} value={handle} onChange={e => setHandle(e.target.value)} placeholder="@instagram" />
      <input style={input} value={number} onChange={e => setNumber(e.target.value)} placeholder="Numero" />
      {guest && (
        <select style={{ ...input, cursor: 'pointer' }} value={gameId} onChange={e => setGameId(e.target.value)}>
          {games.map(g => <option key={g.id} value={g.id}>{g.opponent + ' · ' + fmtDate(g.kickoff)}</option>)}
        </select>
      )}
      <button onClick={save} style={btn(true)}>Guardar</button>
    </div>
  );
}

function GameSheet({ game, players, events, isAdmin, onAdd, onRemove, onSaveScore }) {
  const [gf, setGf] = useState(game.goals_for ?? '');
  const [ga, setGa] = useState(game.goals_against ?? '');
  const countOf = (pid, kind) => events.filter(e => e.game_id === game.id && e.player_id === pid && e.kind === kind).length;
  async function saveScore() {
    await supabase.from('games').update({ goals_for: parseInt(gf, 10), goals_against: parseInt(ga, 10) }).eq('id', game.id);
    onSaveScore();
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ font: '400 26px Anton', textTransform: 'uppercase' }}>{game.opponent}</div>
      <div style={{ font: '400 12px Archivo', color: 'rgba(244,241,234,.45)' }}>{fmtDate(game.kickoff)} · {game.field} · {game.format}</div>
      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={{ ...input, width: 70 }} value={gf} onChange={e => setGf(e.target.value)} placeholder="nos" />
          <input style={{ ...input, width: 70 }} value={ga} onChange={e => setGa(e.target.value)} placeholder="eles" />
          <button onClick={saveScore} style={btn(true)}>Guardar resultado</button>
        </div>
      )}
      {players.filter(p => !p.is_guest || true).map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar player={p} size={28} />
          <div style={{ flex: 1, font: '600 12px Archivo' }}>{p.name}</div>
          {isAdmin ? (
            <>
              <button onClick={() => onRemove(game.id, p.id, 'golo')} style={{ ...btn(false), padding: '6px 10px' }}>-</button>
              <div style={{ width: 26, textAlign: 'center', font: '400 18px Anton', color: RED }}>{countOf(p.id, 'golo')}</div>
              <button onClick={() => onAdd(game.id, p.id, 'golo')} style={{ ...btn(true), padding: '6px 10px' }}>+G</button>
              <button onClick={() => onRemove(game.id, p.id, 'assist')} style={{ ...btn(false), padding: '6px 10px' }}>-</button>
              <div style={{ width: 26, textAlign: 'center', font: '400 18px Anton', color: GOLD }}>{countOf(p.id, 'assist')}</div>
              <button onClick={() => onAdd(game.id, p.id, 'assist')} style={{ ...btn(true), padding: '6px 10px', background: GOLD, color: '#20160a' }}>+A</button>
            </>
          ) : (
            <div style={{ font: '600 12px Archivo', color: 'rgba(244,241,234,.5)' }}>{countOf(p.id, 'golo')}G · {countOf(p.id, 'assist')}A</div>
          )}
        </div>
      ))}
    </div>
  );
}

function PlayerSheet({ player, stats, games, guests, isAdmin, onChanged, onMessage }) {
  const [msg, setMsg] = useState('');
  const myGames = guests.filter(g => g.player_id === player.id).map(g => g.game_id);
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const path = player.id + '-' + Date.now() + '.jpg';
    await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('players').update({ photo_url: data.publicUrl }).eq('id', player.id);
    onChanged();
  }
  async function toggleGame(gameId) {
    if (myGames.indexOf(gameId) >= 0) await supabase.from('game_guests').delete().eq('game_id', gameId).eq('player_id', player.id);
    else await supabase.from('game_guests').insert({ game_id: gameId, player_id: player.id });
    onChanged();
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Avatar player={player} size={60} />
        <div>
          <div style={{ font: '400 24px Anton', textTransform: 'uppercase' }}>{player.name}</div>
          <div style={{ font: '400 12px Archivo', color: 'rgba(244,241,234,.4)' }}>{player.handle} {player.is_guest ? '· emprestado' : '· no ' + (player.number || '-')}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ ...card, flex: 1, textAlign: 'center' }}><div style={{ font: '400 22px Anton', color: RED }}>{stats.goals}</div><div style={label}>Golos</div></div>
        <div style={{ ...card, flex: 1, textAlign: 'center' }}><div style={{ font: '400 22px Anton', color: GOLD }}>{stats.assists}</div><div style={label}>Assist.</div></div>
        <div style={{ ...card, flex: 1, textAlign: 'center' }}><div style={{ font: '400 22px Anton' }}>{stats.played}</div><div style={label}>Jogos</div></div>
      </div>
      {isAdmin && (
        <label style={{ ...btn(false), textAlign: 'center', display: 'block' }}>
          {player.photo_url ? 'Trocar foto' : 'Por foto'}
          <input type="file" accept="image/*" onChange={upload} style={{ display: 'none' }} />
        </label>
      )}
      {isAdmin && player.is_guest && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={label}>Convocar para</div>
          {games.map(g => (
            <button key={g.id} onClick={() => toggleGame(g.id)} style={btn(myGames.indexOf(g.id) >= 0)}>
              {g.opponent + ' · ' + fmtDate(g.kickoff)}
            </button>
          ))}
        </div>
      )}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={input} value={msg} onChange={e => setMsg(e.target.value)} placeholder={'Mensagem para ' + player.name.split(' ')[0]} />
          <button onClick={() => { onMessage('Mensagem do capitao', msg, [player.id]); setMsg(''); }} style={btn(true)}>Enviar</button>
        </div>
      )}
    </div>
  );
}

function Rankings({ players, statsOf, onPick }) {
  const [kind, setKind] = useState('golos');
  const rows = players.map(p => {
    const s = statsOf(p.id);
    return { p, value: kind === 'golos' ? s.goals : kind === 'assist' ? s.assists : s.goals + s.assists, s };
  }).sort((a, b) => b.value - a.value);
  return (
    <section style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[['golos','Golos'],['assist','Assistencias'],['ga','G+A']].map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)} style={{ ...btn(kind === k), flex: 1 }}>{l}</button>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={r.p.id} onClick={() => onPick(r.p.id)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 18, font: '700 12px Archivo', color: 'rgba(244,241,234,.3)' }}>{i + 1}</div>
          <Avatar player={r.p} />
          <div style={{ flex: 1 }}>
            <div style={{ font: '600 13px Archivo' }}>{r.p.name}</div>
            <div style={{ font: '400 10px Archivo', color: 'rgba(244,241,234,.32)' }}>{r.s.played} jogos · {r.s.goals}G {r.s.assists}A</div>
          </div>
          <div style={{ font: '400 22px Anton' }}>{r.value}</div>
        </div>
      ))}
    </section>
  );
}

function Squad({ players, games, guests, isAdmin, onPick, onAdd }) {
  const [view, setView] = useState('plantel');
  const list = players.filter(p => (view === 'emprestados' ? p.is_guest : !p.is_guest));
  return (
    <section style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={label}>Plantel</div>
        {isAdmin && <button onClick={onAdd} style={btn(true)}>+ Jogador</button>}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setView('plantel')} style={{ ...btn(view === 'plantel'), flex: 1 }}>Do clube</button>
        <button onClick={() => setView('emprestados')} style={{ ...btn(view === 'emprestados'), flex: 1 }}>Emprestados</button>
      </div>
      {list.map(p => (
        <div key={p.id} onClick={() => onPick(p.id)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 24, font: '400 17px Anton', color: 'rgba(244,241,234,.28)' }}>{p.number || '-'}</div>
          <Avatar player={p} />
          <div style={{ flex: 1 }}>
            <div style={{ font: '600 13px Archivo' }}>{p.name}</div>
            <div style={{ font: '400 10px Archivo', color: 'rgba(244,241,234,.32)' }}>
              {p.is_guest ? guests.filter(g => g.player_id === p.id).length + ' jogo(s) convocado' : p.handle}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
