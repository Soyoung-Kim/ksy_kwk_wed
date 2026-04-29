import { corsHeaders } from './cors.ts';

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  headers.set('Content-Type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function okOptions() {
  return new Response('ok', {
    status: 200,
    headers: new Headers(corsHeaders),
  });
}

export function methodNotAllowed() {
  return json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405 }
  );
}
