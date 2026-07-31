import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@boiafc.pt',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(request) {
  const { title, body, playerIds } = await request.json();
  let query = admin.from('push_subscriptions').select('endpoint, p256dh, auth, player_id');
  if (Array.isArray(playerIds) && playerIds.length) query = query.in('player_id', playerIds);
  const { data: subs, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  const payload = JSON.stringify({ title: title || 'Boia FC', body: body || '', url: '/' });
  const results = await Promise.all((subs || []).map(async s => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      return true;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      return false;
    }
  }));
  return Response.json({ sent: results.filter(Boolean).length, total: results.length });
}
