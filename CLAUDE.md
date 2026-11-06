@AGENTS.md

# 참 잘했어요 · 어른이 그림일기 (재제작)

20~40대가 어린 시절처럼 **크레파스 그림일기장**을 쓰는 앱. 웹 → 안드로이드 앱(TWA) → iOS 순으로 출시해 판매한다.
원본은 Jay(이사님)의 정적 앱 https://chamjal-diary.vercel.app (저장소 jaythealpha/claude-workspace → apps/picture-diary, 이 폴더와 별개).

## 실행

- `npm run dev -- -p 6900` → http://localhost:6900
- 화면 확인: `node scripts/shot.mjs http://localhost:6900 <출력폴더>` (390px, 테마 3종, 카드·시트·일기장 캡처)
- 아이콘: `src/app/icon.svg` 고친 뒤 `node scripts/icons.mjs`
- 커밋 전: `npx eslint src scripts` + `npx next build`

## 화면 원칙

- 화면 자체가 **일기장 한 쪽**이다. 웹 폼처럼 보이는 입력칸을 만들지 않는다 (원본 디자인을 버린 이유).
- 그라데이션·이모지·입체(3D) 버튼 금지. 종이 + 크레파스 + 연필 선 + 빨간 색연필/도장만.
- 글꼴: 아이 글씨 Gaegu(`--font-kid`), 선생님 글씨 Nanum Pen Script(`--font-pen`), 화면 글씨 Gowun Dodum(`--font-ui`). 이 앱은 요기보 브랜드가 아니라 프리텐다드 규칙을 따르지 않는다.
- 색은 `globals.css`의 `[data-theme]` 변수로만. 카드(`lib/card.ts`)도 같은 변수를 읽는다.
- 화면을 바꾸면 390px 캡처로 확인한다.

## 지켜야 할 것

- **순서 고정 목록**: `lib/weather.ts` WEATHERS, `lib/crayon.ts` CRAYONS, `lib/themes.ts` THEMES 는 저장된 일기가 id로 참조한다. 새 항목은 끝에 추가.
- 일기 내용은 지금 기기(IndexedDB)에만 있다. **일기 내용을 AI 서버(국외)로 보내는 코드는 국외 이전 동의 화면과 같이** 넣는다.
- 유료 생성(이미지·영상) 호출은 실행 전 사용자에게 장수·비용을 묻는다. 키는 서버 환경변수에만.
- 판매 설정은 `lib/business.ts` 한곳. `SALES_READY=false` 동안은 가격 반응만 모은다.

## 구조

- `src/components/DiaryEditor.tsx` 오늘 쓰기 (날씨·그림칸·제목·원고지 → 선생님께 내기 → 도장)
- `src/components/CrayonPad.tsx` 크레파스 그림칸 (획은 0~1 좌표로 저장 → 어떤 크기로도 다시 그림)
- `src/lib/card.ts` 1080×1920 공유 카드
- `src/lib/teacher.ts` 선생님 한 줄 (규칙 기반, 나중에 AI 답장으로 교체 가능)
- `src/components/DiaryShelf.tsx` 내 일기장 (이번 주 도장 + 목록)
- 다음 단계·수익구조: `docs/ROADMAP.md`, `docs/revenue/`
