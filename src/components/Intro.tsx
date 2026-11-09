"use client";

// 처음 온 사람의 첫 화면 (11-09 사용자: "인트로처럼 로그인한 후에 그림일기 쓰기, 과정이 앞쪽에")
// 스케치북 표지 → 이렇게 써요 3장(날씨·그림·도장) → 이름표 만들기(로그인) → 그림일기 쓰기

import { useEffect, useState } from "react";
import { bgSrc } from "@/lib/backgrounds";
import { CRAYONS } from "@/lib/crayon";
import { BrandMark, CrayonStick, StampSvg, ColorWord } from "./Icons";
import { LoginButtons } from "./LoginBox";
import WeatherPicker from "./WeatherPicker";

const HOW = 3; // 쓰는 법 장 수
const SAMPLE_ROWS = ["오늘은 떡볶이를", "먹었다. 맛있었다."]; // 원고지 10칸씩, 낱말이 줄에서 안 잘리게
const SAMPLE = SAMPLE_ROWS.join(" ");

export default function Intro({ onGuest }: { onGuest: () => void }) {
  const [step, setStep] = useState(0); // 0 표지 · 1~3 쓰는 법 · 4 이름표
  const [next, setNext] = useState("/");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 로그인 뒤 돌아올 주소 (?class= 반 숙제 같은 것도 그대로)
    setNext(location.pathname + location.search);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  if (step === 0) {
    return (
      <main className="app intro">
        <Cover90 />
        <p className="intro-lead">
          크레파스로 그리고 세 줄 쓰면,
          <br />
          선생님이 &ldquo;참 잘했어요&rdquo; 도장을 찍어 줘요.
        </p>
        <button type="button" className="btn" onClick={() => setStep(1)}>
          일기장 펼치기
        </button>
        <button type="button" className="linkish intro-skip" onClick={() => setStep(HOW + 1)}>
          이미 이름표가 있어요
        </button>
      </main>
    );
  }

  return (
    <main className="app intro">
      <header className="topbar">
        <span className="brand">
          <BrandMark className="brand-mark" />
          <span>
            <span className="brand-name">
              <ColorWord text="참 잘했어요" />
            </span>
            <span className="brand-sub">어른이 그림일기</span>
          </span>
        </span>
        {step <= HOW && (
          <button type="button" className="toplink" onClick={() => setStep(HOW + 1)}>
            건너뛰기
          </button>
        )}
      </header>

      {step <= HOW ? <HowTo step={step} /> : <Join next={next} onGuest={onGuest} />}

      {step <= HOW ? (
        <div className="intro-nav">
          <div className="intro-dots" role="img" aria-label={`${HOW}장 중 ${step}장`}>
            {Array.from({ length: HOW }, (_, i) => (
              <span key={i} className={i + 1 === step ? "on" : ""} />
            ))}
          </div>
          <button type="button" className="btn" onClick={() => setStep(step + 1)}>
            {step < HOW ? "다음" : "이름표 만들기"}
          </button>
          <button type="button" className="linkish" onClick={() => setStep(step - 1)}>
            이전
          </button>
        </div>
      ) : (
        <div className="intro-nav">
          <button type="button" className="linkish" onClick={() => setStep(HOW)}>
            이전
          </button>
        </div>
      )}
    </main>
  );
}

/** 별 (5각) · 반짝이 (4각) 모양 */
function starPath(cx: number, cy: number, R: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? R * 0.46 : R;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join("L")}Z`;
}
const TWINKLE = "M12 1.5Q12.9 11.1 22.5 12 12.9 12.9 12 22.5 11.1 12.9 1.5 12 11.1 11.1 12 1.5Z";

function Star({ className, twinkle }: { className: string; twinkle?: boolean }) {
  return (
    <svg className={`c90-star ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d={twinkle ? TWINKLE : starPath(12, 12.8, 11)} />
    </svg>
  );
}

/** 처음 표지: 90년대 그림일기장·알림장 느낌 (11-09 사용자 "90년대 일기장이나 알림장 느낌")
 *  색 동그라미 제목 · 항공우편 줄무늬 · 크레파스 학교 운동장 · 별·반짝이 · 알림장식 이름 띠 · 천 테이프 책등 */
function Cover90() {
  return (
    <section className="c90" aria-label="그림일기장 표지">
      <span className="c90-spine" aria-hidden="true" />
      <div className="c90-face">
        <span className="c90-air" aria-hidden="true" />
        <div className="c90-head">
          <h1 className="c90-title" aria-label="그림일기">
            {["그", "림", "일", "기"].map((ch, i) => (
              <span key={ch} className={`c90-ball b${i}`} aria-hidden="true">
                {ch}
              </span>
            ))}
          </h1>
          <p className="c90-en">MY PICTURE DIARY</p>
        </div>
        <span className="c90-air" aria-hidden="true" />
        <div className="c90-pic">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bgSrc("schoolyard")} alt="크레파스로 그린 학교 운동장" />
          <Star className="s1" />
          <Star className="s2" />
          <Star className="s3" />
          <Star className="t1" twinkle />
          <Star className="t2" twinkle />
          <StampSvg className="c90-stamp" />
        </div>
        <div className="c90-info">
          <span className="c90-tag">그림일기</span>
          <div className="c90-fields">
            <p>
              <b>어른이</b>&nbsp;초등학교 <span className="c90-blank" />
              학년 <span className="c90-blank" />
              반 <span className="c90-blank" />번
            </p>
            <p>
              이름 <span className="c90-blank" />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowTo({ step }: { step: number }) {
  return (
    <section className="page intro-step" key={step}>
      <p className="intro-no">
        {step} / {HOW}
      </p>
      {step === 1 && (
        <>
          <h2 className="intro-h">그날 날씨에 동그라미</h2>
          <div className="intro-weather">
            <WeatherPicker value="sun" onChange={() => {}} readOnly />
          </div>
          <p className="intro-p">맑음, 비, 눈… 어릴 때처럼 그날 진짜 날씨에 크레파스로 동그라미를 쳐요.</p>
        </>
      )}
      {step === 2 && (
        <>
          <h2 className="intro-h">크레파스로 그림 한 장</h2>
          <div className="intro-pic">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bgSrc("park")} alt="공원 벤치 배경 위에 크레파스로 그린 사람" />
            <svg className="intro-doodle" viewBox="0 0 400 300" aria-hidden="true">
              <circle cx="200" cy="126" r="24" stroke="#2b2622" />
              <path d="M200 150v62M170 176h60M200 212l-22 40M200 212l22 40" stroke="#e0453a" />
              <path d="M262 92c-8-12-26-4-18 10l18 18 18-18c8-14-10-22-18-10Z" stroke="#e0453a" />
            </svg>
          </div>
          <div className="intro-crayons" aria-hidden="true">
            {["red", "yellow", "green", "sky", "black"].map((id) => (
              <span key={id}>
                <CrayonStick color={CRAYONS.find((c) => c.id === id)?.hex ?? "#2b2622"} selected={id === "red"} />
              </span>
            ))}
          </div>
          <p className="intro-p">배경 그림 위에 쓱쓱. 잘 못 그려도 괜찮아요. 흰 종이에 처음부터 그려도 돼요.</p>
        </>
      )}
      {step === 3 && (
        <>
          <h2 className="intro-h">세 줄 쓰면 선생님이 도장 쾅</h2>
          <div className="intro-paper">
            <div className="intro-grid" role="img" aria-label={SAMPLE}>
              {Array.from({ length: 20 }, (_, i) => {
                const ch = SAMPLE_ROWS[Math.floor(i / 10)][i % 10] ?? "";
                return (
                  <span key={i} className={ch.trim() ? "read" : ""}>
                    {ch}
                  </span>
                );
              })}
            </div>
            <p className="intro-teacher">이 일기, 읽기만 해도 배가 고파요.</p>
            <StampSvg className="intro-stamp-sm" />
          </div>
          <p className="intro-p">선생님이 일기를 읽고 재치 있는 한 줄과 칭찬 스티커를 붙여 줘요. 우리 반에 내면 친구들 도장도 받아요.</p>
        </>
      )}
    </section>
  );
}

function Join({ next, onGuest }: { next: string; onGuest: () => void }) {
  return (
    <section className="page intro-step">
      <h2 className="intro-h">이름표를 만들어요</h2>
      <p className="intro-p" style={{ marginTop: 0 }}>
        가입하면 일기가 서버에도 보관돼서 휴대폰을 바꿔도 그대로예요. 우리 반, 교실 뒤 게시판도 같이 쓸 수 있어요.
      </p>
      <LoginButtons next={next} />
      <div className="intro-guest">
        <button type="button" className="linkish" onClick={onGuest}>
          로그인 없이 먼저 써 볼게요
        </button>
        <p className="note">로그인 없이 쓴 일기는 이 기기에만 저장돼요. 나중에 이름표를 만들면 그대로 합쳐져요.</p>
      </div>
    </section>
  );
}
