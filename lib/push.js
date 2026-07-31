// registo do browser para notificacoes push (gratis, VAPID)
import { supabase } from './supabase';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function enablePush(playerId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'nao-suportado';
  const reg = await navigator.serviceWorker.register('/sw.js');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'recusado';
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  });
  const json = sub.toJSON();
  await supabase.from('push_subscriptions').upsert({
    player_id: playerId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth
  }, { onConflict: 'endpoint' });
  return 'ativo';
}
