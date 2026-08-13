import {
  assertAllowedClientRequest,
  getGuestbookTableName,
  getSupabaseAdmin,
  normalizeGuestbookIcon,
  normalizeGuestbookTheme,
  readJson,
  requireText,
  requireUuid,
  verifyPassword,
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
    const id = requireUuid(body.id);
    const theme = normalizeGuestbookTheme(body.theme);
    const icon = normalizeGuestbookIcon(body.icon);
    const displayName = requireText(body.display_name, '이름', 20);
    const message = requireText(body.message, '메시지', 300);
    const password = body.password;

    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from(getGuestbookTableName())
      .select('id, password_hash, del_yn')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!existing) {
      throw new Error('수정할 방명록을 찾을 수 없습니다.');
    }

    if (existing.del_yn) {
      throw new Error('이미 삭제된 방명록입니다.');
    }

    const isPasswordMatched = await verifyPassword(
      password,
      existing.password_hash
    );

    if (!isPasswordMatched) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }

    const { data, error } = await supabase
      .from(getGuestbookTableName())
      .update({
        theme,
        icon,
        display_name: displayName,
        message,
      })
      .eq('id', id)
      .eq('del_yn', false)
      .select('id, theme, icon, display_name, message, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return json({
      success: true,
      entry: data,
    });
  } catch (error) {
    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '방명록 수정에 실패했습니다.',
      },
      { status: 400 }
    );
  }
});
