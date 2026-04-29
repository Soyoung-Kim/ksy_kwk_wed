import { createClient } from 'npm:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';

const GUESTBOOK_TABLE = 'guestbook_entries';
const BCRYPT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 72; // bcrypt는 72바이트 제한 주의

export function getGuestbookTableName() {
  return GUESTBOOK_TABLE;
}

export function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL 환경변수를 찾을 수 없습니다.');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수를 찾을 수 없습니다.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return {};
    }

    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function normalizeSide(value: unknown): 'groom' | 'bride' {
  const side = String(value ?? '').trim().toLowerCase();

  if (side !== 'groom' && side !== 'bride') {
    throw new Error('side 값은 groom 또는 bride 여야 합니다.');
  }

  return side as 'groom' | 'bride';
}

export function requireText(
  value: unknown,
  label: string,
  maxLength: number,
  minLength = 1
) {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < minLength) {
    throw new Error(`${label}을(를) 입력해 주세요.`);
  }

  if (text.length > maxLength) {
    throw new Error(`${label}은(는) ${maxLength}자 이하로 입력해 주세요.`);
  }

  return text;
}

export function requireUuid(value: unknown) {
  const id = String(value ?? '').trim();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    throw new Error('유효한 id 값이 아닙니다.');
  }

  return id;
}

function getPasswordPepper() {
  // 설정 안 했으면 빈 문자열로 동작
  return Deno.env.get('GUESTBOOK_PASSWORD_PEPPER') ?? '';
}

function normalizePassword(value: unknown) {
  const password = String(value ?? '');

  if (!password.trim()) {
    throw new Error('비밀번호를 입력해 주세요.');
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해 주세요.`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하로 입력해 주세요.`);
  }

  return password;
}

function buildPasswordInput(rawPassword: unknown) {
  const password = normalizePassword(rawPassword);
  const pepper = getPasswordPepper();
  return `${password}${pepper}`;
}

export async function hashPassword(value: unknown) {
  const passwordInput = buildPasswordInput(value);
  return await bcrypt.hash(passwordInput, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: unknown,
  storedHash: string
) {
  if (!storedHash) return false;

  const passwordInput = buildPasswordInput(plainPassword);
  return await bcrypt.compare(passwordInput, storedHash);
}

function getAllowedClientKeys() {
  const keys = new Set<string>();

  const publishableKeysRaw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (publishableKeysRaw) {
    try {
      const parsed = JSON.parse(publishableKeysRaw);

      if (Array.isArray(parsed)) {
        parsed.forEach((value) => {
          if (typeof value === 'string' && value.trim()) {
            keys.add(value.trim());
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        Object.values(parsed).forEach((value) => {
          if (typeof value === 'string' && value.trim()) {
            keys.add(value.trim());
          }
        });
      }
    } catch {
      // ignore
    }
  }

  const legacyAnon = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacyAnon) {
    keys.add(legacyAnon);
  }

  return Array.from(keys);
}

function getRequestApiKey(req: Request) {
  const apikey = req.headers.get('apikey')?.trim();
  if (apikey) return apikey;

  const auth = req.headers.get('authorization') ?? '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }

  return '';
}

export function assertAllowedClientRequest(req: Request) {
  const requestKey = getRequestApiKey(req);

  if (!requestKey) {
    throw new Error('apikey 헤더가 없습니다.');
  }

  const allowedKeys = getAllowedClientKeys();

  if (allowedKeys.length === 0) {
    throw new Error('허용된 publishable key 목록을 읽지 못했습니다.');
  }

  const isMatched = allowedKeys.some((key) => key === requestKey);

  if (!isMatched) {
    throw new Error('허용되지 않은 클라이언트 호출입니다.');
  }
}
