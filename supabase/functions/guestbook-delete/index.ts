import {
  assertAllowedClientRequest,
  getGuestbookTableName,
  getSupabaseAdmin,
  readJson,
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
      throw new Error('삭제할 방명록을 찾을 수 없습니다.');
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

    const { error } = await supabase
      .from(getGuestbookTableName())
      .update({
        del_yn: true,
      })
      .eq('id', id)
      .eq('del_yn', false);

    if (error) {
      throw new Error(error.message);
    }

    return json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '방명록 삭제에 실패했습니다.',
      },
      { status: 400 }
    );
  }
});
