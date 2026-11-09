@AGENTS.md

# 참 잘했어요 · 어른이 그림일기 (재제작)

20~40대가 어린 시절처럼 **크레파스 그림일기장**을 쓰는 앱. 웹 → 안드로이드 앱(TWA) → iOS 순으로 출시해 판매한다.
원본은 Jay(이사님)의 정적 앱 https://chamjal-diary.vercel.app (저장소 jaythealpha/claude-workspace → apps/picture-diary, 이 폴더와 별개).

## 실행

- `npm run dev:mem` → http://localhost:6900 (임시 Mongo + 개발용 로그인. 끄면 데이터 사라짐, 첫 실행은 Mongo 내려받기. 그림도 진짜 카페24 대신 public/_dev-uploads 로)
- `npm run dev:mem -- --voice ../todo/.env.local` → 위와 같고 아이 목소리 읽기까지 켬 (그 파일의 TYPECAST_API_KEY 하나만 빌려 씀)
- `npm run dev` → .env.local 의 실제 Mongo·구글·FTP·Claude 로 실행. 변수 목록은 `.env.example`
- .env.local 현재(11-09, 사용자 지시로 옮겨 옴): Claude 키·Cafe24 FTP = Desktop/Dong(보이스동화) .env.local, **MONGODB_URI = 예산 대시보드(Dropbox …/예산설정/budget-dashboard/.local/.env)의 Atlas cluster0**. 이 앱은 그 안의 **DB chamjal 만** 쓴다 — 같은 클러스터의 yogico_budget·yogiboB2b 는 건드리지 않는다. **구글 로그인만 아직 없음**
- `npm run dev` 는 실제 Atlas·FTP 에 쓴다 → 개발용 로그인으로 시험하면 실제 DB 에 dev: 사용자가 생긴다. 평소 시험은 dev:mem, 실제 DB 로 시험했으면 dev: 사용자·FTP 시험 그림을 지운다
- 참여 기능 화면 시험: dev:mem 켠 뒤 `node scripts/e2e-social.mjs <임시 Mongo 주소>` → shots/social
- 인트로·날씨 캡처: `node scripts/shot-intro.mjs` → shots/intro
- 관리자 페이지 캡처: e2e-social 로 시험 데이터 → `node scripts/account.mjs add fe --staff developer --password <시험 비번> --uri <임시 Mongo 주소>` → `node scripts/shot-admin.mjs fe <시험 비번>` → shots/admin
- **운영자 아이디 만들기·비밀번호 다시 만들기**: `node --env-file=.env.local scripts/account.mjs add|reset|list` (화면에서 가입하는 길은 없음, 비밀번호는 한 번만 출력)
- 화면 확인: `node scripts/shot.mjs http://localhost:6900 <출력폴더>` (390px, 테마 3종, 카드·시트·일기장 캡처)
- 아이콘: `src/app/icon.svg` 고친 뒤 `node scripts/icons.mjs`
- 커밋 전: `npx eslint src scripts` + `npx next build`

## 화면 원칙

- 화면 자체가 **일기장 한 쪽**이다. 웹 폼처럼 보이는 입력칸을 만들지 않는다 (원본 디자인을 버린 이유).
- 그라데이션·이모지·입체(3D) 버튼 금지. 종이 + 크레파스 + 연필 선 + 빨간 색연필/도장만.
- 글꼴: 아이 글씨 Gaegu(`--font-kid`), 선생님 글씨 Nanum Pen Script(`--font-pen`), 화면 글씨 Gowun Dodum(`--font-ui`). 이 앱은 요기보 브랜드가 아니라 프리텐다드 규칙을 따르지 않는다.
- 색은 `globals.css`의 `[data-theme]` 변수로만. 카드(`lib/card.ts`)도 같은 변수를 읽는다.
- 화면을 바꾸면 390px 캡처로 확인한다.
- **예외: 관리자 페이지(/admin)** 는 보이스 동화 관리실과 같은 토스풍 밝은 관리 색(`src/app/admin/admin.css`, 모든 규칙 `.adm` 안). 일기장 테마·크레파스 글꼴을 따르지 않는다. 넓은 화면은 왼쪽 메뉴, 1024px 아래는 위 알약 줄.

## 지켜야 할 것

- **날씨 = 그날 진짜 날씨** (11-09 사용자: "나의 기분 날씨가 아니라 진짜 그날 날씨"). 고르는 6개 = 맑음·구름 조금·흐림·비·눈·천둥 번개(`weatherChoices`, 순서는 PICK). 무지개는 마음 날씨 시절 것이라 새 일기에선 안 고르고 예전 일기에서만 보인다. 선생님·목소리도 날씨를 기분으로 읽지 않는다(슬픈 날은 글로 알아본다).
- **처음 온 사람 인트로** (11-09 사용자: "인트로처럼 로그인한 후에 그림일기 쓰기"): `/` = `HomeGate` → 로그인 안 했고 이 기기에서 처음이면 `Intro`(스케치북 표지 → 쓰는 법 3장 → 이름표 만들기) → 그림일기 쓰기. 로그인했거나 "로그인 없이 먼저 써 볼게요"를 누르면 localStorage chamjal.intro=1 로 다음부턴 바로 쓰기. 인트로 동안 아래 탭은 숨김.
- **순서 고정 목록**: `lib/weather.ts` WEATHERS, `lib/crayon.ts` CRAYONS, `lib/themes.ts` THEMES, `lib/backgrounds.ts` BACKGROUNDS 는 저장된 일기·공유 링크가 id로 참조한다. id를 바꾸거나 지우지 말고 새 항목은 끝에 추가.
- **그림칸 배경**: **원본 사이트 크레파스 화풍(시안 A)**으로 통일 (11-06 사용자: "기존 크레파스 느낌이 나와야", 파스텔은 별로). 원본 예시 그림을 잘라 만든 drafts/bg/_ref-original.png 를 매 장 참고 그림으로 보낸다. 만들기는 `node --env-file=../jp/.env scripts/gpt-bg.mjs scripts/bg-scenes.json <이름…>` (GPT gpt-image-2 중간 품질, 장당 약 0.04달러, 키는 N3 앱 .env를 빌려 씀·복사 금지). 원본은 drafts/bg(git 제외), 앱용은 public/bg + public/bg/thumb. "직접 그리기" = 배경 없음(흰 종이).
- **선생님 한 줄 = Claude** (11-06 사용자: 이 한 줄이 앱의 포인트). `src/app/api/teacher/route.ts`, 모델은 파일 맨 위 MODEL 한 곳(지금 claude-haiku-5-5(11-06 사용자 결정), effort low, Haiku 는 서버 대체 모델 없음). 키는 `.env.local`의 ANTHROPIC_API_KEY(git 제외). 처음 낼 때 국외 이전 동의(ConsentSheet, localStorage chamjal.aiConsent)를 받은 기기만 부르고, 동의 안 함·키 없음·9초 넘김이면 `lib/teacher.ts` 기본 한 줄. 위험 신호(care)면 109 안내를 띄운다. 흐름: 선생님께 내기 → 줄마다 빨간 밑줄(읽는 중, 그동안 Claude 호출) → 도장 쾅(진동) → 한 줄.
- **넓은 화면 배경**(760px 이상): 테마별 public/web-bg (문구점=doodle, 도화지=town, 방학 숙제=desk). 11-09 힉스필드 나노바나나 2K 16:9, 원본 예시 그림을 참고 그림으로. 휴대폰 화면은 바꾸지 않는다.
- **아이 목소리 읽어주기**(11-09 사용자: 여자아이 **수아**·남자아이 **태지**): 도장 받은 뒤·하루씩 보기에서 "소리 내어 읽기" + 여자아이/남자아이 고르기(나 → 기본 설정에도). `api/read`(Typecast ssfm-v30, 감정 프리셋 없이 기본 목소리), 읽는 글은 `lib/readScript.ts`(날짜·날씨·제목·본문). 받은 소리는 기기 IndexedDB 에 두고 다시 안 부름(`lib/readAloud.ts`). 서버에 TYPECAST_API_KEY 없으면 버튼이 안 보인다. 키는 한글나라 Desktop/todo/.env.local 것을 dev-mem `--voice` 로만 빌려 씀(복사 금지). 계정이 보이스동화·한글나라와 같아서 이번 달 19만 안전선에서 잠근다 — **운영에 켜려면 이 앱 전용 요금제·키가 필요**. Typecast 는 국내 회사(처리 위탁, 국외 이전 아님).
- **선생님 답장 = 재치 + 칭찬 스티커** (11-09 사용자: 이게 재미의 핵심). 답장은 일기 속 구체적인 것을 짚는 농담 한 스푼 + 따뜻한 마무리(슬픈 날은 다정하게만), 1~2문장. 칭찬 스티커 16종(`lib/stickers.ts`, 순서 고정)에서 Claude 가 1~3개 고른다. 기본 답장(`lib/teacher.ts`)도 같은 결. 스티커는 원고지 위 오른쪽(화면·카드 같은 자리)에 하나씩 톡톡 붙는다. 11-09 실측(12편, 한 편 약 0.4원·1~2초): 45자 안쪽, "선생님" 남발 금지, 예시 문장 베끼기 금지, 밀린 숙제 = 지난 하루 한 편(몰아 쓰기 아님)을 프롬프트에 적어 둠. 60자 넘으면 서버가 문장 끝에서 자른다(fitLine). 프롬프트 고치면 `drafts/teacher/run.mjs`(12편)로 다시 뽑아 본다.
- **밀린 숙제**: 날짜를 눌러 최근 90일 중 지난 날 일기를 쓴다(달력 빈 날 → /?date=). `late` 표시, 그림일기 책 장수엔 들어가고 개근상에는 안 들어간다. 선생님이 밀린 숙제를 짚어 답한다.
- **우리 반 재미 요소**(11-09): 출석부(오늘 **반에 낸** 친구만 도장, 혼자 쓴 일기는 안 드러남), 반 숙제(반장만, 그날 한 줄, `/?class=<id>`로 들어오면 쓰기 화면에 뜨고 다 쓰면 그 반에 자동으로 냄), 짝꿍 한마디(`/api/notes`, 반 친구끼리만, 40자, 공개 게시판엔 없음).
- **크레파스 손맛**: 그림칸에서 고른 색 크레파스가 손끝을 따라다닌다(마우스는 늘, 손가락은 그릴 때). 몽당 크레파스: 색마다 칠한 길이만큼 짧아지고 뭉툭해짐(`lib/crayonWear.ts`, 이 기기 저장, 45,000px면 다 닳음) → "새 크레파스 꺼내기". 나중에 크레파스 팩 상품과 이어진다.
- 일기 내용은 지금 기기(IndexedDB)에만 있다. **일기 내용을 AI 서버(국외)로 보내는 코드는 국외 이전 동의 화면과 같이** 넣는다.
- 유료 생성(이미지·영상) 호출은 실행 전 사용자에게 장수·비용을 묻는다. 키는 서버 환경변수에만.
- **그림은 본인이 그린다** (11-09 사용자): AI가 대신 그려 주기는 없다. 대신 배경 그림을 다양하게 제공한다 — 배경은 사용자가 `docs/배경-프롬프트.md`(= `node scripts/bg-import.mjs doc`, 목록은 scripts/bg-catalog.json)로 직접 뽑아 `drafts/bg/incoming/<id>.png` 에 넣으면 `node scripts/bg-import.mjs` 가 4:3 자르기·썸네일·목록 추가까지 한다.
- 판매 설정은 `lib/business.ts` 한곳. `SALES_READY=false` 동안은 가격 반응만 모은다.

## 참여 기능 (11-06, 사용자: "다 가보자")

- 로그인 = **구글** (OAuth 직접 구현 `api/auth/google`, jose 세션 쿠키 `cj_session`) + **받은 아이디** (`api/auth/password`, scrypt, 5번 틀리면 15분 잠금, googleSub `id:아이디`). 아이디 계정은 scripts/account.mjs 로만 만든다. 개발용 로그인은 DEV_LOGIN=1 + 운영 아님일 때만.
- **운영자 아이디** (11-09 사용자): **fe = 개발자**, **yogico = 회사(클라이언트)** — 보이스 동화 관리실과 같은 두 계정. 진짜 Atlas(chamjal)에 만들어 둠. 둘 다 /admin 에 들어오고, 개발자만 대시보드 '연결 상태·처리 기록'을 본다. ADMIN_EMAILS 구글 계정은 '선생님'으로 같이 들어온다.
- **관리자 페이지** `/admin` (11-09 사용자: "동화 앱 어드민단과 비슷한 관리자 페이지, 회원·회원별 반 묶음 파악"): 대시보드 · 회원(이름표·로그인·들어간 반·일기 수, 정지) · 반(반장·친구·반에 낸 일기·짝꿍 한마디) · 게시판 검사. 서버는 `lib/server/admin.ts` requireStaff 로 막고 응답은 no-store. **운영자는 남에게 보여 준 일기(게시판·반)만 펼쳐 본다 — 혼자 쓴 일기는 날짜만** (canOpen/bodyVisible). 정지하면 로그인 막고 게시판 일기도 내린다. 처리는 adminlog 에 남는다.
- 저장 = **Mongo(DB chamjal) + Cafe24 FTP**(그림 파일, QR 스튜디오 price_Line 과 같은 FTP_* / PUBLIC_ASSET_BASE 이름). FTP 없으면 개발은 public/_dev-uploads.
- 일기는 **이 기기가 원본(local-first)**: IndexedDB 에 먼저, 로그인하면 `lib/sync.ts` 가 서버와 합친다(기기 id = clientId 로 겹침 방지).
- 이름표: 별명·초등학교 입학 연도·반. 게시판엔 이것만 보이고 구글 이메일은 안 보인다.
- 교실 뒤 게시판: 그림만/글까지, 붙이기 전 `lib/server/moderate.ts`(Haiku 5.5, 글+미리보기 그림) 검사. 검사 못 하면 운영은 pending → /admin(ADMIN_EMAILS). 신고 3건 자동 숨김. 비밀 일기는 못 붙임.
- 도장 3·스티커 3(`lib/social.ts` REACTIONS), 오늘의 숙제(TOPICS, 날짜로 돌아감) — 둘 다 순서 고정 목록.
- 상장: 개근 7/30/100일(일기 저장 때), 지난주 참 잘한 일기 1~3등(처음 조회 때 계산·저장), 상장 그림은 `lib/certificate.ts`.
- 우리 반: 초대 코드 6자리(/join/코드), 30명, 반 피드는 FTP 없이 획으로 그린다.

## 구조

- `src/components/DiaryEditor.tsx` 오늘 쓰기 (날씨·그림칸·제목·원고지 → 선생님께 내기 → 도장)
- `src/components/CrayonPad.tsx` 크레파스 그림칸 (획은 0~1 좌표로 저장 → 어떤 크기로도 다시 그림)
- `src/lib/card.ts` 1080×1920 공유 카드
- `src/lib/teacher.ts` 선생님 한 줄 (규칙 기반, 나중에 AI 답장으로 교체 가능)
- `src/components/DiaryShelf.tsx` 내 일기장 (이번 주 도장 + 목록)
- 다음 단계·수익구조: `docs/ROADMAP.md`, `docs/revenue/`
