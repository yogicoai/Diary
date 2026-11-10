# Diary

**참 잘했어요 · 어른이 그림일기** — 어릴 때 쓰던 그림일기장을 어른이 되어 다시 쓰는 앱. 크레파스로 그리고 세 줄 쓰면, 선생님이 도장을 찍어 줘요.

- 앱 소개: `/about`
- 실행: `npm run dev:mem` → http://localhost:6900 (임시 DB) · `npm run dev` (실제 DB, 변수 목록은 `.env.example`)
- 개발 규칙·구조: [CLAUDE.md](CLAUDE.md) · 다음 단계와 출시 전 체크리스트: [docs/ROADMAP.md](docs/ROADMAP.md)
- 배포: Vercel (서버 지역 서울 `icn1`, `vercel.json`). 베타는 `src/lib/business.ts` BETA (배포하면 켜짐) — 정식 출시 전에 false

Next.js 16 · React 19 · MongoDB Atlas · Cafe24 FTP · Claude (선생님 한 줄)
