# GitHub Pages 모바일 청첩장

## 포함 기능
- 저장소 사진 기반 자동 슬라이드
- 갤러리 확대 보기
- 신랑/신부 전화하기 버튼 (`tel:`)
- 신랑/신부 문자하기 버튼 (`sms:`)
- 주소 복사 버튼
- 계좌번호 복사 버튼

## 모바일 호환
- `tel:` 링크는 Android/iPhone에서 전화 앱으로 연결됩니다.
- `sms:` 링크는 문자 앱으로 연결됩니다.
- 복사 버튼은 클립보드 API를 사용하고, 제한 환경에서는 복사 안내창으로 대체됩니다.

## 배포 시 캐시 갱신 규칙 (필수)

GitHub Pages CDN과 모바일·카카오톡·삼성 인터넷 브라우저는 이전 HTML, CSS, JavaScript를 오래 보관할 수 있습니다. QR 코드 주소를 이미 전달한 뒤에도 최신 화면이 열리도록, **화면 동작·스타일을 변경해 배포할 때는 아래 항목을 반드시 함께 갱신합니다.**

1. 루트의 [`version.json`](./version.json)에서 `version` 값을 새 값으로 변경합니다. 예: `20260910.2`.
2. 변경한 HTML의 로컬 CSS·JavaScript URL에 같은 버전 쿼리를 붙입니다. 예: `./styles/style.css?v=20260910.2`, `./scripts/main.js?v=20260910.2`.
3. 각 페이지의 `version-check.js?v=...` 값도 같은 버전으로 변경합니다.
4. `git push` 후 모바일에서 QR 원래 주소로 접속해 자동으로 `__release=새버전`이 붙으며 한 번 새로 열리는지 확인합니다.

`version-check.js`는 매 접속마다 `version.json`을 캐시 없이 확인합니다. 버전이 다르면 QR 주소의 기본 경로는 바꾸지 않고 `__release` 값만 붙여 최신 파일 묶음을 다시 불러옵니다. 이 규칙을 생략하면 PC에는 새 화면이 보이는데 모바일에는 이전 CSS/JS가 남는 문제가 다시 발생할 수 있습니다.



SUPABASE_ANON_KEY는 GitHub public 저장소에 들어가도 괜찮습니다.

Supabase 공식 문서 기준으로 publishable / anon 계열 키는 브라우저, 모바일 앱, 공개
소스코드에서 사용 가능한 키입니다. 대신 전제는 RLS(Row Level Security) 를 제대로 걸어두는 것입니다.

반대로 service_role / secret key는 절대 브라우저나 GitHub에 넣으면 안 됩니다.

이 키는 RLS를 우회하므로 Edge Functions 비밀값으로만 써야 합니다.
Supabase는 이런 비밀값을 Edge Functions 환경변수(Deno.env.get(...))로 관리하라고 안내합니다.

그리고 정적 사이트(GitHub Pages)에서는 anon key를 “숨길 방법”이 사실상 없습니다.

빌드 타임 환경변수로 넣든, config.js로 분리하든, 최종적으로 브라우저에 내려가면 사용자가 볼 수 있습니다.
그래서 숨기는 게 아니라, anon key + RLS + Edge Functions 구조로 안전하게 설계하는 게 정답입니다.
npx supabase functions deploy guestbook-create --no-verify-jwt
npx supabase functions deploy guestbook-update --no-verify-jwt
npx supabase functions deploy guestbook-delete --no-verify-jwt
npx supabase functions deploy guestbook-ai --no-verify-jwt
npx serve . -l 5500

## 연락처·계좌 관리

Supabase SQL Editor에서 `supabase/sql/wedding_directory.sql`을 한 번 실행하세요. 이후 `wedding_contacts`, `wedding_accounts` 테이블의 행을 추가·수정하면 GitHub Pages를 다시 배포하지 않아도 연락처와 계좌 정보가 바뀝니다. `display_order`는 표시 순서이며, `is_visible`을 끄면 데이터를 보존한 채 화면에서 숨길 수 있습니다. 공개 사이트는 읽기만 가능하고, 내용 수정은 Supabase Dashboard에서만 할 수 있습니다.
