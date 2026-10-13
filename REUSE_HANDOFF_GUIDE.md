# 청첩장 재사용 전달 가이드

이 프로젝트는 정적 GitHub Pages 화면과 Supabase 데이터·관리자 페이지를 함께 사용합니다. 다른 사람이 재사용할 때는 **코드만 복사하고, GitHub 저장소·Supabase 프로젝트·관리자 계정·사진 저장소는 반드시 새로 만들어야 합니다.**

기존 운영 청첩장의 데이터베이스나 관리자 계정을 함께 사용하면 연락처, 계좌, 참석 응답, 방명록과 사진이 섞일 수 있습니다. 새 사용자에게 기존 Supabase 프로젝트의 관리자 권한을 주거나 기존 프로젝트의 URL/키를 그대로 쓰게 하면 안 됩니다.

## 전달할 것과 전달하지 않을 것

| 구분 | 전달 방식 |
| --- | --- |
| 코드 | 이 저장소를 바탕으로 만든 **새 비공개 GitHub 저장소**에서 전달 |
| 디자인·기능 | HTML, CSS, JavaScript, Edge Function 코드만 사용 |
| 사진·이름·전화번호·계좌·방명록 | 모두 삭제하거나 예시 값으로 교체 후 전달 |
| Supabase | 새 사용자가 자기 명의의 **새 프로젝트**를 생성 |
| 관리자 계정 | 새 Supabase Auth 사용자와 새 `wedding_admins` 권한을 생성 |
| Google Drive·Google OAuth | 새 사용자의 Drive 폴더와 OAuth 클라이언트를 별도로 생성 |
| 비밀값 | `service_role`, Google OAuth secret, OpenAI 키, pepper는 절대 저장소·메신저·브라우저 코드로 전달하지 않음 |

`config.js`의 publishable key는 공개 페이지에 포함되는 값이지만, 새 프로젝트의 값으로 바꿔야 합니다. 기존 프로젝트의 URL과 키를 재사용하지 마세요.

## 새 사용자에게 넘기는 권장 순서

1. 기존 운영 저장소를 포크하지 말고, 새 비공개 GitHub 저장소를 만듭니다.
2. 이 코드에서 개인 사진과 개인정보를 지운 복사본을 새 저장소에 올립니다.
3. 새 사용자가 자기 Supabase 프로젝트와 관리자 로그인 계정을 생성합니다.
4. 새 Supabase에서 필요한 SQL과 Edge Function을 설치합니다.
5. `config.js`, 사진, 문구, GitHub Pages 주소를 새 사용자 정보로 교체합니다.
6. 관리자 페이지와 공개 페이지를 각각 확인한 뒤 GitHub Pages를 공개합니다.

## 1. 코드 복사 전 개인정보 제거

새 저장소를 만들기 전에 아래 항목을 새 사용자 정보 또는 예시 값으로 바꿉니다.

- `assets/photos/`, `assets/photos.json`, `assets/roughMap.png`, OG 이미지와 아이콘
- `index.html`의 예식 일시, 장소, 주소, 안내 문구, 이름
- `config.js`의 `siteKey`, 예식 일시, 커플명, 카카오 공유 문구·이미지·링크, Supabase URL·publishable key
- `supabase/sql/wedding_directory.sql`의 예시 연락처·계좌
- `supabase/sql/admin_portal.sql`, `seed_local_gallery_assets.sql`의 기존 사진 경로
- `supabase/sql/wedding_guest_photo_uploads.sql`의 기존 `site_key`와 Google Drive 폴더 ID

특히 기존 실제 사진, 연락처, 계좌번호, Google Drive 폴더 ID가 남지 않았는지 GitHub에 올리기 전에 다시 확인합니다.

## 2. 새 Supabase 프로젝트 만들기

1. 새 사용자의 Supabase 계정에서 프로젝트를 만듭니다.
2. **Authentication > Users**에서 관리자 이메일과 비밀번호를 만듭니다.
3. 새 프로젝트의 Project URL과 publishable/anon key를 `config.js`에 입력합니다.
4. 기존 Supabase 프로젝트에는 새 사용자를 추가하지 않습니다.

새 프로젝트의 SQL Editor에서 아래 순서로 실행합니다. 기존 운영 DB에서 실행하면 안 됩니다.

1. `supabase/sql/guestbook.sql`
2. `supabase/sql/wedding_directory.sql` — 실행 전 예시 연락처·계좌를 새 사용자 정보로 교체
3. `supabase/sql/admin_portal.sql` — 연락처/계좌 테이블을 만든 뒤 실행
4. `supabase/sql/wedding_gallery_variants.sql`
5. `supabase/sql/wedding_site_settings.sql`
6. `supabase/sql/wedding_gallery_settings.sql`
7. `supabase/sql/wedding_display_settings.sql`
8. `supabase/sql/wedding_rsvp.sql`
9. `supabase/sql/admin_authorize_soyoung.sql` — `YOUR_ADMIN_EMAIL`을 새 관리자 이메일로 교체

`wedding_rsvp_reset_for_site_tracking.sql`은 기존 RSVP를 삭제하는 마이그레이션이므로 **새 빈 프로젝트에는 실행하지 않습니다.**

### 선택 기능

| 기능 | 추가 작업 |
| --- | --- |
| Storage 갤러리 업로드 | `seed_local_gallery_assets.sql`을 새 사진 목록에 맞게 수정 후 실행 |
| 하객 사진 업로드 | 아래 “하객 사진” 단계 진행 |
| AI 축하 문구 | `guestbook-ai` 함수와 OpenAI 비밀값 설정 |

## 3. 관리자 페이지 연결

새 관리자 계정을 만든 뒤, `admin_authorize_soyoung.sql`의 `YOUR_ADMIN_EMAIL`을 실제 관리자 이메일로 바꾸어 실행합니다.

이 작업은 새 사용자의 Supabase에서만 실행합니다. 완료 후 `/admin/`에서 로그인해 연락처·계좌·갤러리를 바꿀 수 있는지 확인합니다.

`siteKey`는 한 청첩장과 그 데이터를 구분하는 값입니다. 새 사용자는 예를 들어 `kim_lee_wed`처럼 고유한 값으로 설정합니다. 원본/복제처럼 사이트를 두 개 운영한다면 각 저장소와 각 `siteKey`를 다르게 하고, 같은 Supabase 프로젝트를 공유할지 먼저 결정해야 합니다.

## 4. 하객 사진 기능을 사용할 경우

사진 업로드 기능은 선택 사항입니다. 사용하지 않으면 하단 추억 공유 버튼을 관리자에서 끄고, Google Drive·OAuth 설정은 건너뛰어도 됩니다.

사용할 경우 새 사용자가 다음을 직접 준비합니다.

1. 별도의 Google Drive 폴더를 만들고 폴더 ID를 기록합니다.
2. 새 Google Cloud OAuth 클라이언트를 만들고 Drive API를 활성화합니다.
3. 새 Supabase Edge Function Secrets에 아래 값을 등록합니다.
   - `GOOGLE_DRIVE_CLIENT_ID`
   - `GOOGLE_DRIVE_CLIENT_SECRET`
4. `wedding_guest_photos.sql`, `wedding_google_drive_oauth.sql`을 실행합니다.
5. `wedding_guest_photo_uploads.sql`을 열어 기존 두 `site_key`와 Drive 폴더 ID를 새 값으로 바꾼 뒤 실행합니다.
6. 함수를 배포합니다.

```powershell
npx supabase functions deploy guest-photo-upload
npx supabase functions deploy google-drive-authorize
npx supabase functions deploy google-drive-oauth-callback
```

Google OAuth의 redirect URI는 새 Supabase 프로젝트의 `google-drive-oauth-callback` 주소로 등록해야 합니다. 기존 청첩장의 callback 주소나 Drive 폴더를 쓰면 안 됩니다.

## 5. GitHub Pages 배포

1. 새 저장소의 기본 브랜치를 `main`으로 설정합니다.
2. GitHub Pages의 배포 원본을 그 저장소의 `main` 브랜치로 설정합니다.
3. 배포 URL을 `config.js`의 `share.copyLink`와 카카오 공유 설정에 반영합니다.
4. 공개 URL, `/admin/`, RSVP, 방명록, 계좌·연락처, 모바일 사진 갤러리를 모두 테스트합니다.

페이지 동작이나 스타일을 변경해 배포할 때는 `version.json`과 각 HTML의 `version-check.js?v=...` 값을 함께 올립니다. 자세한 규칙은 `README.md`의 “배포 시 캐시 갱신 규칙”을 따릅니다.

## 전달 전 마지막 확인표

- [ ] 새 GitHub 저장소에 기존 커플의 사진·실명·전화번호·계좌번호·주소가 남아 있지 않다.
- [ ] `config.js`가 새 Supabase 프로젝트 URL과 publishable key를 사용한다.
- [ ] 기존 Supabase의 관리자·테이블·Storage·Drive 폴더를 새 사용자와 공유하지 않는다.
- [ ] `service_role`, Google OAuth secret, OpenAI 키, pepper가 Git 기록과 메시지에 없다.
- [ ] 새 `/admin/` 로그인 계정이 새 Supabase에만 등록돼 있다.
- [ ] GitHub Pages URL과 카카오 공유 링크가 새 청첩장 주소다.
- [ ] 모바일에서 QR 주소, 관리자, RSVP, 사진 업로드(사용 시)를 각각 확인했다.

## 운영 청첩장 보호 원칙

이 문서는 템플릿 전달을 위한 안내일 뿐, 현재 운영 중인 `ksy_kwk_wed`와 `kwk_ksy_wed`의 코드·배포·DB에는 어떤 변경도 가하지 않습니다. 새 사용자를 위한 작업은 항상 새 저장소와 새 Supabase 프로젝트에서 시작합니다.
