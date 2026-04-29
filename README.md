# GitHub Pages 모바일 청첩장

이 폴더를 그대로 새 GitHub 저장소에 올리면 바로 모바일 청첩장 페이지를 배포할 수 있습니다.

## 포함 기능
- 저장소 사진 기반 자동 슬라이드
- 갤러리 확대 보기
- 신랑/신부 전화하기 버튼 (`tel:`)
- 신랑/신부 문자하기 버튼 (`sms:`)
- 주소 복사 버튼
- 계좌번호 복사 버튼
- GitHub Pages 바로 배포 가능

## 1) 저장소 만들기
- GitHub에서 새 저장소 생성
- 저장소 이름 예시: `wedding-invitation`

## 2) 파일 업로드
- 이 폴더의 파일 전체를 저장소 루트에 업로드
- 사진은 `assets/photos/` 폴더에 넣기
- 대표 슬라이드용 사진은 `assets/photos/main.jpg` 로 저장
- 갤러리 사진은 `01.jpg`, `02.jpg` 같이 올리거나 `assets/photos.json` 경로를 수정

## 3) GitHub Pages 켜기
- 저장소 → **Settings** → **Pages**
- **Build and deployment** 에서 **Deploy from a branch** 선택
- Branch는 `main`, 폴더는 `/root` 선택 후 저장
- 1~2분 뒤 아래 주소로 접속
  - `https://아이디.github.io/저장소이름/`

## 4) 문구 바꾸기
- `index.html`에서 이름, 날짜, 장소, 계좌번호, 연락처 수정
- `assets/photos.json`에서 슬라이드/갤러리 이미지 목록 수정
- `style.css`에서 색상 수정

## 5) 중요한 점
GitHub Pages는 서버가 없어서 폴더 안 사진을 자동으로 읽어오지 못합니다.
그래서 `assets/photos.json`처럼 **사진 목록 파일**을 두고, 그 JSON을 읽어서 슬라이드와 갤러리를 그리는 방식이 가장 간단하고 안정적입니다.

## 6) 모바일 호환
- `tel:` 링크는 Android/iPhone에서 전화 앱으로 연결됩니다.
- `sms:` 링크는 문자 앱으로 연결됩니다.
- 복사 버튼은 클립보드 API를 사용하고, 제한 환경에서는 복사 안내창으로 대체됩니다.
