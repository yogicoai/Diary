"use client";

// 이 앱은요? (/about) — 11-10 사용자: "어떤 어플인지 설명이 있어야", "지금 앱의 HTML·CSS 를 활용해서 만들어 주면 같이 올릴게".
// 앱 화면 조각을 그대로 가져다 쓴다: 90년대 그림일기장 표지 · 알림장 · 쓰는 법(인트로) · 진짜 카드 그리기(lib/card.ts) ·
// 선생님 도장·칭찬 스티커 · 이름표 · 오늘의 숙제 띠 · 출석부 · 상장함 · 몽당 크레파스. 가짓수는 목록 길이에서 읽는다.
// 베타 서버(BETA=1)면 '지금은 베타예요' 쪽지와 둘러보기 단추가 붙는다.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { renderCard } from "@/lib/card";
import { CRAYONS, type Point, type Stroke } from "@/lib/crayon";
import { todayKey } from "@/lib/date";
import { useMe } from "@/lib/me";
import { DIARY_STAMPS } from "@/lib/stamps";
import { STICKERS } from "@/lib/stickers";
import type { Diary } from "@/lib/store";
import { THEMES } from "@/lib/themes";
import { BrandMark, CrayonStick, StampSvg } from "./Icons";
import { Cover90, HowTo } from "./Intro";
import { StickerSvg } from "./PraiseStickers";

/* ---------- 예시 카드: 분식집 배경 위에 크레파스로 떡볶이 (0~1 좌표, 그림칸 4:3) ---------- */
const pts = (xy: number[][]): Point[] => xy.map(([x, y]) => ({ x, y }));
const oval = (cx: number, cy: number, rx: number, ry: number, n = 22): Point[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: cx + rx * Math.cos((i / n) * Math.PI * 2), y: cy + ry * Math.sin((i / n) * Math.PI * 2) }));

const SAMPLE_DRAWING: Stroke[] = [
  { color: "#2b2622", size: 0.012, points: oval(0.5, 0.75, 0.17, 0.075) }, // 접시
  ...[
    [0.41, 0.74, 0.46, 0.71],
    [0.47, 0.77, 0.52, 0.74],
    [0.53, 0.73, 0.58, 0.71],
    [0.55, 0.78, 0.6, 0.76],
    [0.43, 0.78, 0.47, 0.77],
  ].map(([x1, y1, x2, y2]) => ({ color: "#e0453a", size: 0.04, points: pts([[x1, y1], [x2, y2]]) })), // 떡
  ...[0.44, 0.5, 0.56].map((x) => ({ color: "#8c7b6b", size: 0.012, points: pts([[x, 0.65], [x - 0.015, 0.61], [x + 0.01, 0.57], [x - 0.01, 0.53]]) })), // 김
  { color: "#2b2622", size: 0.012, points: oval(0.2, 0.42, 0.06, 0.08) }, // 얼굴
  { color: "#2b2622", size: 0.012, points: pts([[0.175, 0.44], [0.2, 0.47], [0.225, 0.44]]) },
  { color: "#2b2622", size: 0.022, points: pts([[0.18, 0.4], [0.182, 0.401]]) },
  { color: "#2b2622", size: 0.022, points: pts([[0.218, 0.4], [0.22, 0.401]]) },
];

function sampleDiary(date: string): Diary {
  return {
    id: "about-sample",
    date,
    weather: "sun",
    title: "떡볶이 먹은 날",
    body: "퇴근하고 친구랑 떡볶이를 먹었다. 너무 맛있어서 웃음이 났다.",
    strokes: SAMPLE_DRAWING,
    bg: "snack-bar",
    teacher: "떡볶이 앞에선 어른도 웃게 되죠. 국물까지 칭찬해요!",
    teacherBy: "ai",
    stickers: ["yum", "laugh"],
    stamp: "cham",
    secret: false,
    createdAt: 0,
  };
}

/** 앱이 실제로 만드는 1080×1920 카드를 이 자리에서 그린다 */
function SampleCard() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    renderCard(sampleDiary(todayKey()))
      .then((c) => new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.86)))
      .then((b) => {
        if (!b || !alive) return;
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);
  return (
    <figure className="about-cardshot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="떡볶이 먹은 날 그림일기 카드: 크레파스 그림, 원고지 글, 선생님 한 줄과 도장" /> : null}
    </figure>
  );
}

/* ---------- 둘러보기·시작 단추 (로그인 상태·베타에 따라) ---------- */
function Start() {
  const { me, flags, loading, logout, startDemo } = useMe();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (loading) return <div className="about-cta" aria-busy="true" />;

  if (me && !me.demo) {
    return (
      <div className="about-cta">
        <Link href="/" className="btn">
          오늘 일기 쓰러 가기
        </Link>
      </div>
    );
  }
  if (me?.demo) {
    return (
      <div className="about-cta">
        <Link href="/" className="btn">
          예제 일기장 펼쳐 보기
        </Link>
        <button
          type="button"
          className="btn plain"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await logout();
            router.push("/login?next=/");
          }}
        >
          내 이름으로 시작하기
        </button>
      </div>
    );
  }
  if (flags?.beta) {
    return (
      <div className="about-cta">
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await startDemo();
              router.push("/");
            } catch {
              setBusy(false);
            }
          }}
        >
          예제 일기장 둘러보기
        </button>
        <Link href="/login?next=/" className="btn plain">
          내 이름으로 시작하기
        </Link>
      </div>
    );
  }
  return (
    <div className="about-cta">
      <Link href="/" className="btn">
        그림일기 써 보기
      </Link>
      <Link href="/login?next=/" className="btn plain">
        이름표 만들기
      </Link>
    </div>
  );
}

const ROLL: [string, boolean][] = [
  ["길동", true],
  ["지민", true],
  ["도윤", false],
  ["서연", true],
  ["하준", false],
];
const WEAR = [0, 0.25, 0.5, 0.1, 0.7, 0.35];

export default function AboutPage() {
  const { flags } = useMe();
  return (
    <main className="app about">
      <header className="topbar">
        <Link href="/?cover=1" className="brand">
          <BrandMark className="brand-mark" />
          <span>
            <span className="brand-name">이 앱은요?</span>
            <span className="brand-sub">참 잘했어요 어른이 그림일기</span>
          </span>
        </Link>
      </header>

      <Cover90 name="" age={null} />

      <section className="al-note" aria-label="이 앱은요">
        <span className="al-tab">알림장</span>
        <span className="al-date">어른이 그림일기</span>
        <p className="al-line al-head">이 앱은요?</p>
        <p className="al-line">어릴 때 쓰던 그림일기장을</p>
        <p className="al-line">어른이 되어 다시 쓰는 앱이에요.</p>
        <p className="al-line al-pen">크레파스로 그리고 세 줄 쓰면, 선생님이 도장을 찍어 줘요.</p>
        <p className="al-line">
          <span className="al-no">누구</span>하루를 짧게 남기고 싶은 어른이
        </p>
        <p className="al-line">
          <span className="al-no">준비물</span>손가락 크레파스, 오늘 있었던 일
        </p>
        <p className="al-small">설치 없이 휴대폰·컴퓨터 브라우저에서 바로 써요. 로그인하지 않아도 일기는 이 기기에 남아요.</p>
      </section>

      <h2 className="about-h">이렇게 써요</h2>
      <HowTo step={1} total={4} />
      <HowTo step={2} total={4} />
      <HowTo step={3} total={4} />
      <section className="page intro-step">
        <p className="intro-no">4 / 4</p>
        <h2 className="intro-h">카드로 만들어 자랑해요</h2>
        <SampleCard />
        <p className="intro-p">다 쓴 일기는 세로 카드 한 장이 돼요. 카카오톡·인스타 스토리에 바로 올리고, 링크로 보내면 친구가 그대로 펼쳐 봐요.</p>
      </section>

      <h2 className="about-h">선생님이 읽어 줘요</h2>
      <section className="about-card">
        <span className="about-tag">빨간 펜</span>
        <h3>한 줄 답장과 도장</h3>
        <div className="about-stamps">
          {DIARY_STAMPS.map((s) => (
            <StampSvg key={s.id} className="about-stamp" stamp={s.id} />
          ))}
        </div>
        <p>
          선생님(AI)이 일기를 읽고, 그날 이야기에서 하나를 콕 집어 재치 있는 한 줄을 빨간 펜으로 써 줘요. 도장 {DIARY_STAMPS.length}가지 중 하나를
          찍고, 칭찬 스티커 {STICKERS.length}가지 중에서 골라 붙여 줘요. 힘든 날엔 농담 없이 다정하게만요.
        </p>
        <div className="about-stickers">
          {["best", "yum", "cheer", "laugh", "rest"].map((id) => (
            <StickerSvg key={id} id={id} size={58} />
          ))}
        </div>
      </section>

      <h2 className="about-h">어른이 초등학교 생활</h2>

      <section className="about-card">
        <span className="about-tag">이름표</span>
        <h3>어른이 초등학교 ○학년 ○반</h3>
        <div className="nametag about-nametag">
          <span className="nt-hole" aria-hidden="true" />
          <span className="nt-label">이름표</span>
          <b className="nt-name">길동</b>
          <span className="nt-sub">어른이 초등학교 3학년 8반</span>
        </div>
        <p>이름과 생년월일을 적으면 올해 나이 두 자리가 학년·반이 돼요. 38살이면 3학년 8반! 해마다 1월 1일에 다 같이 진급하고, 생일엔 선생님이 축하해 줘요.</p>
      </section>

      <section className="about-card">
        <span className="about-tag">숙제</span>
        <h3>오늘의 숙제 = 어른이 미션</h3>
        <div className="topic-banner about-topic">
          <div className="tb-row">
            <span className="tb-label">오늘의 숙제</span>
            <span className="tb-topic">점심 메뉴 3초 컷</span>
          </div>
          <p className="tb-sub">
            <span className="tb-subject">월요일 · 바른 생활</span>
            <span className="tb-note">&lsquo;아무거나&rsquo;는 오답 처리합니다.</span>
          </p>
        </div>
        <p>요일마다 시간표가 있어요. 사진 한 장이나 한 줄로 숙제 검사를 받으면 칭찬 스티커판에 한 장씩 붙고, 스티커판은 달마다 새 판이 돼요.</p>
      </section>

      <section className="about-card">
        <span className="about-tag">우리 반</span>
        <h3>친구·가족과 같은 반</h3>
        <section className="attendance" aria-label="출석부 예시">
          <div className="att-head">
            <b>출석부</b>
            <span>오늘 3/5명 냈어요</span>
          </div>
          <div className="att-grid">
            {ROLL.map(([name, handedIn]) => (
              <div key={name} className={`att${handedIn ? " in" : ""}`}>
                <span className="att-slot">{handedIn && <StampSvg />}</span>
                <span className="att-name">{name}</span>
              </div>
            ))}
          </div>
        </section>
        <p>초대 코드 6자리로 친구·가족·동료를 모아요. 반에 일기를 낸 날엔 출석부에 도장, 반장은 반 숙제를 내고, 친구 일기엔 짝꿍 한마디를 남겨요.</p>
      </section>

      <section className="about-card">
        <span className="about-tag">게시판</span>
        <h3>교실 뒤 게시판</h3>
        <p>자랑하고 싶은 일기는 그림만, 또는 글까지 붙여요. 친구들이 도장과 스티커를 찍어 주고, 지난주 참 잘한 일기 1~3등은 상장을 받아요. 같은 해에 태어난 동갑 친구 일기만 모아 볼 수도 있어요.</p>
      </section>

      <section className="about-card">
        <span className="about-tag">상장</span>
        <h3>개근상도 받아요</h3>
        <div className="award-grid">
          {["일주일 개근상", "숙제 잘하는 어른이 상", "생일 축하장"].map((label) => (
            <div key={label} className="award">
              <StampSvg className="award-stamp" />
              <b>{label}</b>
              <span>참 잘했어요</span>
            </div>
          ))}
        </div>
        <p>7·30·100일 개근상, 숙제 10·30·100번 상, 지난주 참 잘한 일기, 생일 축하장. 상장은 그림으로 저장할 수 있어요.</p>
      </section>

      <section className="about-card">
        <span className="about-tag">내 일기장</span>
        <h3>도장이 쌓이는 일기장</h3>
        <div className="intro-crayons" aria-hidden="true">
          {["red", "orange", "yellow", "green", "sky", "blue"].map((id, i) => (
            <span key={id}>
              <CrayonStick color={CRAYONS.find((c) => c.id === id)?.hex ?? "#2b2622"} selected={false} wear={WEAR[i]} />
            </span>
          ))}
        </div>
        <p>
          달력에 도장이 하나씩 쌓여요. 깜빡한 날은 밀린 일기로 지난 90일까지 쓰고, 아무에게도 안 보이는 비밀 일기도 있어요. 크레파스는 칠할수록
          닳아서 몽당 크레파스가 돼요. 그림은 오늘 있었던 일을 쓰면 AI 가 1차로 그려 주고(하루 한 장), 부족한 건 크레파스로 더 그려서 완성해요. 일기장 {THEMES.length}가지, 표지는 내 그림으로 바꿀 수 있어요.
        </p>
      </section>

      <section className="al-note" aria-label="마음 놓고 써요">
        <span className="al-tab">약속</span>
        <p className="al-line al-head">마음 놓고 써요</p>
        <p className="al-line">
          <span className="al-no">1.</span>혼자 쓴 일기는 나만 봐요
        </p>
        <p className="al-line">
          <span className="al-no">2.</span>게시판·우리 반엔 보낼 때만
        </p>
        <p className="al-line">
          <span className="al-no">3.</span>생년월일·이메일은 안 보여요
        </p>
        <p className="al-line">
          <span className="al-no">4.</span>만 14살부터 가입해요
        </p>
        <p className="al-small">
          운영하는 선생님도 혼자 쓴 일기는 날짜만 봐요. 선생님 한 줄은 AI(미국 Anthropic 의 Claude)가 쓰는데, 처음에 동의한 기기만 일기 글을 보내고
          그림은 보내지 않아요. AI 그림을 그려 받으면 그릴 장면 설명만 미국 OpenAI 로 가요. 게시판에 붙이기 전엔 AI 가 한 번 살펴보고, 신고가 3번 모이면 숨겨요.
        </p>
      </section>

      {flags?.beta && (
        <section className="al-note" aria-label="지금은 베타예요">
          <span className="al-tab">베타</span>
          <p className="al-line al-head">지금은 베타예요</p>
          <p className="al-line">
            <span className="al-no">1.</span>처음엔 예제 일기장으로 둘러봐요
          </p>
          <p className="al-line">
            <span className="al-no">2.</span>써 보려면 이름만 적고 시작
          </p>
          <p className="al-line">
            <span className="al-no">3.</span>구글 로그인은 정식 출시 때
          </p>
          <p className="al-small">
            예제 일기장(3학년 8반 길동)은 여러 사람이 같이 둘러보는 일기장이라 읽기만 돼요. &lsquo;내 이름으로 시작하기&rsquo;에서 이름만 적으면 내
            일기장이 생겨요. 같은 이름을 적으면 같은 일기장이 열리니 나만 아는 이름으로 적어 주세요. 베타 때 쓴 일기는 정식 출시 때 정리될 수 있어요.
          </p>
        </section>
      )}

      <Start />
      <p className="note about-foot">참 잘했어요 · 어른이 그림일기{flags?.beta ? " (베타)" : ""}</p>
    </main>
  );
}
