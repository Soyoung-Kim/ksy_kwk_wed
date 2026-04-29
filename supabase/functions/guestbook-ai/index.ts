import { json, methodNotAllowed, okOptions } from '../_shared/http.ts';
import { assertAllowedClientRequest } from '../_shared/guestbook.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini';

const VERSION_LABELS = {
  friend: '친구',
  coworker: '직장동료',
  family: '가족',
  olderBrother: '형/오빠',
  olderSister: '누나/언니'
} as const;

type Target = 'groom' | 'bride';
type VersionKey = keyof typeof VERSION_LABELS;

function normalizeName(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, 20);
}

function normalizeTarget(value: unknown): Target | null {
  if (value === 'groom' || value === 'bride') {
    return value;
  }
  return null;
}

function normalizeVersion(value: unknown): VersionKey | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in VERSION_LABELS) {
    return value as VersionKey;
  }

  return null;
}

function cleanSuggestion(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .slice(0, 150);
}

function dedupeSuggestions(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function extractMessageContent(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function parseSuggestionsFromText(text: string) {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

  const suggestions = dedupeSuggestions(
    rawSuggestions.map(cleanSuggestion).filter(Boolean)
  ).slice(0, 4);

  return suggestions;
}

async function requestSuggestions(params: {
  target: Target;
  version: VersionKey;
  groomName: string;
  brideName: string;
}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 가 설정되지 않았습니다.');
  }

  const targetLabel = params.target === 'groom' ? '신랑' : '신부';
  const targetName = params.target === 'groom' ? params.groomName : params.brideName;
  const counterpartName = params.target === 'groom' ? params.brideName : params.groomName;
  const versionLabel = VERSION_LABELS[params.version];

  const systemPrompt = [
    '너는 한국어 결혼식 축하 문구 추천 도우미다.',
    '반드시 JSON 객체만 반환해야 한다.',
    '형식은 {"suggestions":["문구1","문구2","문구3","문구4"]} 이어야 한다.',
    'suggestions 배열에는 정확히 4개의 문구가 들어가야 한다.',
    '모든 문구는 한국어여야 한다.',
    '각 문구는 150자 이하여야 한다.',
    '서로 문체와 표현을 다르게 만들어라.',
    '실제 모바일 청첩장 방명록에 바로 붙여넣을 수 있는 자연스러운 축하 문구로 작성해라.',
    '번호 목록, 따옴표 장식, 해시태그, 이모지 남발은 금지한다.'
  ].join(' ');

  const userPrompt = [
    `축하 대상은 ${targetLabel} ${targetName}이다.`,
    `배우자 이름은 ${counterpartName}이다.`,
    `작성자 관계 버전은 ${versionLabel}이다.`,
    '결혼을 진심으로 축하하는 따뜻한 톤으로 작성해라.',
    '문구마다 표현이 겹치지 않게 해라.',
    '과장되거나 오글거리는 표현은 줄이고, 실제 지인이 남길 법한 자연스러운 문장으로 작성해라.',
    '누가봐도 AI의 말투를 사용하지말고, 사람이 작성한 자연스러운 어투로 작성해라.',
    '반드시 JSON만 반환해라.'
  ].join(' ');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 1.0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      'OpenAI 추천 문구 생성에 실패했습니다.';
    throw new Error(message);
  }

  const content = extractMessageContent(payload);

  if (!content) {
    throw new Error('추천 문구 응답이 비어 있습니다.');
  }

  let suggestions: string[] = [];

  try {
    suggestions = parseSuggestionsFromText(content);
  } catch (error) {
    console.error('Failed to parse OpenAI response:', error);
    throw new Error('추천 문구 형식을 해석하지 못했습니다.');
  }

  if (suggestions.length < 4) {
    throw new Error('추천 문구를 충분히 생성하지 못했습니다. 다시 시도해주세요.');
  }

  return suggestions.slice(0, 4);
}

function toErrorResponse(error: unknown) {
  if (error instanceof Response) {
    return error;
  }

  const message =
    error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

  if (
    message.includes('허용되지 않은 요청') ||
    message.includes('apikey') ||
    message.includes('권한')
  ) {
    return json({ error: message }, 403);
  }

  if (
    message.includes('확인해주세요') ||
    message.includes('비어') ||
    message.includes('형식') ||
    message.includes('충분히 생성하지 못했습니다')
  ) {
    return json({ error: message }, 400);
  }

  if (message.includes('OPENAI_API_KEY')) {
    return json({ error: message }, 500);
  }

  return json({ error: message }, 500);
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return okOptions();
    }

    if (req.method !== 'POST') {
      return methodNotAllowed();
    }

    assertAllowedClientRequest(req);

    const body = await req.json().catch(() => null);

    if (!body) {
      return json({ error: '요청 본문을 읽을 수 없습니다.' }, 400);
    }

    const target = normalizeTarget(body.target);
    const version = normalizeVersion(body.version);
    const groomName = normalizeName(body.groomName, '우경');
    const brideName = normalizeName(body.brideName, '소영');

    if (!target) {
      return json({ error: '추천 대상을 확인해주세요.' }, 400);
    }

    if (!version) {
      return json({ error: '추천 버전을 확인해주세요.' }, 400);
    }

    const suggestions = await requestSuggestions({
      target,
      version,
      groomName,
      brideName
    });

    return json(
      {
        suggestions,
        meta: {
          target,
          version,
          model: OPENAI_MODEL
        }
      },
      200
    );
  } catch (error) {
    console.error('guestbook-ai error:', error);
    return toErrorResponse(error);
  }
});
