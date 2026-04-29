import {
  assertAllowedClientRequest,
  getGuestbookTableName,
  getSupabaseAdmin,
  hashPassword,
  normalizeSide,
  readJson,
  requireText,
} from '../_shared/guestbook.ts';
import { json, methodNotAllowed, okOptions } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return okOptions();
  }

  if (req.method !== 'POST') {
    return methodNotAllowed();
  }

  try {
    assertAllowedClientRequest(req);

    const body = await readJson(req);
    const side = normalizeSide(body.side);
    const displayName = requireText(body.display_name, '이름', 20);
    const message = requireText(body.message, '메시지', 300);
    const passwordHash = await hashPassword(body.password);

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from(getGuestbookTableName())
      .insert({
        side,
        display_name: displayName,
        message,
        password_hash: passwordHash,
        del_yn: false,
      })
      .select('id, side, display_name, message, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return json(
      {
        success: true,
        entry: data,
      },
      { status: 201 }
    );
  } catch (error) {
    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '방명록 등록에 실패했습니다.',
      },
      { status: 400 }
    );
  }
});
