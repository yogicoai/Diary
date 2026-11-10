"use client";

// 첫 화면 (11-09 사용자: "인트로처럼 로그인한 후에 그림일기 쓰기", "처음 접근 시 겉표지가 나와야")
// 처음 온 사람: 90년대 그림일기장 표지 → 이렇게 써요 3장(날씨·그림·도장) → 이름표 만들기(로그인) → 그림일기 쓰기
// 다시 온 사람(그날 처음): 표지(이름 칸에 이름표) → 일기장 펼치기 → 그림일기 쓰기

import { useEffect, useState } from "react";
import { bgSrc } from "@/lib/backgrounds";
import { CRAYONS } from "@/lib/crayon";
import { useCoverPic } from "@/lib/coverPic";
import { todayKey } from "@/lib/date";
import { useHomework } from "@/lib/homework";
import { ageOf, birthProblem, gradeClass, gradeText, isBirthday, TOO_YOUNG } from "@/lib/social";
import { useTopic } from "@/lib/useTopic";
import CoverPicSheet from "./CoverPicSheet";
import Sheet from "./Sheet";
import { BrandMark, CakeIcon, CrayonStick, PencilIcon, StampSvg, ColorWord } from "./Icons";
import { READ_ALOUD } from "@/lib/business";
import { kidChoice, setReadVoice } from "@/lib/readAloud";
import { READ_VOICES, type ReadVoice } from "@/lib/readScript";
import { LoginButtons } from "./LoginBox";
import WeatherPicker from "./WeatherPicker";

const HOW = 3; // 쓰는 법 장 수
const SAMPLE_ROWS = ["오늘은 떡볶이를", "먹었다. 맛있었다."]; // 원고지 10칸씩, 낱말이 줄에서 안 잘리게
const SAMPLE = SAMPLE_ROWS.join(" ");

type Me = { nickname: string; age: number | null; birth: string | null; admin: boolean } | null;

export default function Intro({
  first,
  me,
  onOpen,
  onGuest,
  onSaveTag,
  onUnder14,
}: {
  first: boolean;
  me: Me;
  onOpen: () => void;
  onGuest: () => void;
  onSaveTag: (nickname: string, birth: string) => Promise<void>; // 표지에서 이름표(이름·생년월일) 쓰기
  onUnder14: (birth: string) => Promise<void>; // 만 14살 미만이 맞다고 하면 가입 정보를 바로 지운다 (11-10 사용자 결정)
}) {
  const [step, setStep] = useState(0); // 0 표지 · 1~3 쓰는 법 · 4 이름표
  const [next, setNext] = useState("/");
  // 로그인했는데 생년월일이 없으면 표지 알림장에서 이름·생년월일을 꼭 받는다
  // (11-10 사용자: "가입 후에 생년월일과 이름", "몇 학년 몇 반 — 내 나이에 맞는 반을 설정", 올해 나이 → 어른이 초등학교 O학년 O반,
  // 해마다 1월 1일 진급, 생일엔 선생님이 축하). 선생님 아이디는 빼고. 만 14살 미만이면 맞는지 묻고 가입 정보를 바로 지운다.
  const asking = !!me && !me.birth && !me.admin;
  const [name, setName] = useState(me?.nickname ?? "");
  const [by, setBy] = useState("");
  const [bm, setBm] = useState("");
  const [bd, setBd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const birth = by.length === 4 && bm && bd ? `${by}-${bm.padStart(2, "0")}-${bd.padStart(2, "0")}` : "";
  const birthErr = birth ? birthProblem(birth) : null;
  const birthOk = !!birth && !birthErr;
  const tooYoung = birthErr === TOO_YOUNG; // 진짜 날짜인데 만 14살 미만
  const [youngOpen, setYoungOpen] = useState(false);
  const newAge = birthOk ? ageOf({ birth }) : null;
  const nameOk = /^[\p{L}\p{N}]{2,8}$/u.test(name.trim());
  const cover = useCoverPic(); // 표지 그림: 내가 고른 내 그림 → 없으면 학교 운동장
  const [picOpen, setPicOpen] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 로그인 확인이 늦게 오면 그때 이름 칸을 채운다
    if (me?.nickname) setName((n) => n || me.nickname);
  }, [me?.nickname]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 로그인 뒤 돌아올 주소 (?class= 반 숙제 같은 것도 그대로)
    setNext(location.pathname + location.search);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  if (step === 0) {
    const open = async () => {
      if (first) return setStep(1);
      if (!asking) return onOpen();
      if (tooYoung) return setYoungOpen(true); // 만 14살 미만: 생년월일이 맞는지 한 번 묻는다
      setSaving(true);
      setError(null);
      try {
        await onSaveTag(name.trim(), birth);
        onOpen();
      } catch (e) {
        setError(e instanceof Error ? e.message : "이름표를 못 적었어요. 다시 해 볼까요?");
      } finally {
        setSaving(false);
      }
    };
    return (
      <main className="app intro">
        <Cover90
          name={asking ? name.trim() : (me?.nickname ?? "")}
          age={asking ? newAge : (me?.age ?? null)}
          pic={cover.src}
          onChangePic={first ? undefined : () => setPicOpen(true)}
        />
        <CoverPicSheet open={picOpen} onClose={() => setPicOpen(false)} current={cover.id} />
        <Notice me={first ? null : me} asking={asking}>
          {asking && (
            <>
              <p className="al-line">
                내 이름은
                <input
                  className="al-fill name"
                  value={name}
                  maxLength={8}
                  aria-label="이름"
                  onChange={(e) => setName(e.target.value.replace(/\s/g, ""))}
                />
                이에요.
              </p>
              <p className="al-line al-pen">몇 학년 몇 반일까요? 내 나이에 맞는 반을 정해 주세요.</p>
              <p className="al-line">
                생일은
                <input
                  className="al-fill year"
                  inputMode="numeric"
                  value={by}
                  maxLength={4}
                  placeholder="1988"
                  aria-label="태어난 해"
                  onChange={(e) => setBy(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
                년
                <input
                  className="al-fill md"
                  inputMode="numeric"
                  value={bm}
                  maxLength={2}
                  placeholder="3"
                  aria-label="태어난 달"
                  onChange={(e) => setBm(e.target.value.replace(/\D/g, "").slice(0, 2))}
                />
                월
                <input
                  className="al-fill md"
                  inputMode="numeric"
                  value={bd}
                  maxLength={2}
                  placeholder="14"
                  aria-label="태어난 날"
                  onChange={(e) => setBd(e.target.value.replace(/\D/g, "").slice(0, 2))}
                />
                일
              </p>
              {birthOk && <p className="al-line al-pen">→ {gradeText(newAge)}! 해마다 1월 1일에 진급해요.</p>}
              <p className="al-small">
                {birthErr ??
                  "올해 나이 두 자리가 학년·반이 돼요(38살 → 3학년 8반). 생일엔 선생님이 축하해 줘요. 생년월일은 다른 사람에게 안 보이고, 게시판·우리 반엔 이름과 학년·반만 보여요. 이름은 별명으로 바꿔도 돼요."}
              </p>
            </>
          )}
        </Notice>
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="btn" onClick={() => void open()} disabled={asking && (!(birthOk || tooYoung) || !nameOk || saving)}>
          {saving ? "이름표 다는 중…" : "일기장 펼치기"}
        </button>
        {asking && <Under14Sheet open={youngOpen} birth={birth} onClose={() => setYoungOpen(false)} onConfirm={onUnder14} />}
        {first ? (
          <button type="button" className="linkish intro-skip" onClick={() => setStep(HOW + 1)}>
            이미 이름표가 있어요
          </button>
        ) : asking ? null : (
          <button type="button" className="linkish intro-skip" onClick={() => setStep(1)}>
            쓰는 법 다시 보기
          </button>
        )}
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
          <button type="button" className="toplink" onClick={() => (first ? setStep(HOW + 1) : onOpen())}>
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
          <button type="button" className="btn" onClick={() => (step < HOW || first ? setStep(step + 1) : onOpen())}>
            {step < HOW ? "다음" : first ? "이름표 만들기" : "일기 쓰러 가기"}
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

/** 만 14살 미만 (11-10 사용자 결정: 확인되면 가입 정보를 바로 지운다). 잘못 적은 어른이 지워지지 않게 생년월일이 맞는지 한 번 묻는다.
 *  맞다고 하면 서버의 가입 정보(구글 이름·이메일, 올린 일기)를 지우고, 이 기기 일기는 손님 일기장으로 돌려놓는다 (HomeGate) */
function Under14Sheet({ open, birth, onClose, onConfirm }: { open: boolean; birth: string; onClose: () => void; onConfirm: (birth: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [y, m, d] = birth ? birth.split("-").map(Number) : [0, 0, 0];
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(birth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "잠시 문제가 생겼어요. 다시 해 볼까요?");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} label="만 14살이 되면 다시 만나요">
      <h2>만 14살이 되면 다시 만나요</h2>
      <p>
        어른이 그림일기는 만 14살부터 가입할 수 있어요. 생일이 {y}년 {m}월 {d}일이 맞으면, 방금 만든 이름표(구글에서 받은 이름·이메일)를 바로
        지울게요.
      </p>
      <p style={{ marginTop: 8 }}>이 기기에 쓴 일기는 지우지 않고 이 기기에만 남겨 둬요.</p>
      {error && <p className="form-error">{error}</p>}
      <div className="btn-row">
        <button type="button" className="btn plain" onClick={onClose}>
          다시 적기
        </button>
        <button type="button" className="btn" onClick={() => void confirm()} disabled={busy}>
          {busy ? "지우는 중…" : "맞아요, 지워요"}
        </button>
      </div>
    </Sheet>
  );
}

/** 표지 아래 알림장 쪽지 (11-10 사용자: "이 부분도 디자인이 필요"). 줄 공책 + 빨간 여백 줄 + '알림장' 딱지.
 *  처음 온 사람 = 쓰는 법 1·2·3 / 다시 온 사람 = 인사·오늘의 숙제·준비물 / 나이 없는 사람 = 이름표 쓰기(children) */
function Notice({ me, asking, children }: { me: Me; asking: boolean; children?: React.ReactNode }) {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 오늘 날짜는 기기 시계 기준
    setToday(todayKey());
  }, []);
  const topic = useTopic(today);
  const hw = useHomework(today, !!today && !!me && !asking); // 오늘 숙제 검사 받았나
  const bday = !!today && !!me && isBirthday(me.birth, today);
  const newYear = !!today && today.slice(5) === "01-01"; // 1월 1일 = 다 같이 진급하는 날 (11-10 사용자)
  const grade = me ? gradeText(me.age) : "";
  return (
    <section className="al-note" aria-label="알림장">
      <span className="al-tab">알림장</span>
      {today && (
        <span className="al-date">
          {bday && <CakeIcon className="al-cake" />}
          {Number(today.slice(5, 7))}월 {Number(today.slice(8, 10))}일{bday && " 생일"}
        </span>
      )}
      {asking ? (
        <>
          <p className="al-line al-head">이름표를 써 주세요</p>
          {children}
        </>
      ) : me ? (
        <>
          {/* 생일 (11-10 사용자: "생일 날짜에는 선생님이 축하 메시지를") · 1월 1일엔 다 같이 진급 (11-10 사용자: "매년 1월 1일날 학년이 오르는") */}
          {bday ? (
            <p className="al-line al-bday">{me.nickname}, 생일 축하해요!</p>
          ) : newYear ? (
            <p className="al-line al-bday">{me.nickname}, 새해 복 많이 받아요!</p>
          ) : (
            <p className="al-line">{me.nickname}, 오늘도 왔네요!</p>
          )}
          {newYear && grade ? (
            <p className="al-line al-pen">오늘부터 {grade}! 진급{bday ? "도" : ""} 축하해요.</p>
          ) : bday ? (
            <p className="al-line al-pen">오늘 일기를 내면 선생님이 축하해 줄게요.</p>
          ) : null}
          <p className="al-line">
            <span className="al-no">숙제</span>
            {topic?.text ?? "오늘 있었던 일 그리기"}
            {hw.data?.mine && <span className="al-done">검사 끝</span>}
          </p>
          {topic?.note && <p className="al-line al-pen">{topic.note}</p>}
          <p className="al-line">
            <span className="al-no">준비물</span>
            {bday ? "크레파스, 생일 케이크 한 조각" : newYear ? "크레파스, 새 학년 새 마음" : "크레파스, 오늘 있었던 일"}
          </p>
        </>
      ) : (
        <>
          <p className="al-line">
            <span className="al-no">1.</span>그날 날씨에 동그라미
          </p>
          <p className="al-line">
            <span className="al-no">2.</span>크레파스로 그림 한 장
          </p>
          <p className="al-line">
            <span className="al-no">3.</span>세 줄 쓰고 선생님께 내기
          </p>
          <p className="al-line al-pen">→ &ldquo;참 잘했어요&rdquo; 도장 쾅!</p>
        </>
      )}
    </section>
  );
}

/** 처음 표지: 90년대 그림일기장·알림장 느낌 (11-09 사용자 "90년대 일기장이나 알림장 느낌")
 *  색 동그라미 제목 · 항공우편 줄무늬 · 크레파스 학교 운동장 · 별·반짝이 · 알림장식 이름 띠 · 천 테이프 책등 */
export function Cover90({ name, age, pic, onChangePic }: { name: string; age: number | null; pic?: string | null; onChangePic?: () => void }) {
  const g = gradeClass(age); // 38살 → 3학년 8반 (번호는 없다, 11-10 사용자)
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
          <img src={pic ?? bgSrc("schoolyard")} alt={pic ? "내가 그린 그림" : "크레파스로 그린 학교 운동장"} />
          <Star className="s1" />
          <Star className="s2" />
          <Star className="s3" />
          <Star className="t1" twinkle />
          <Star className="t2" twinkle />
          <StampSvg className="c90-stamp" />
          {onChangePic && (
            <button type="button" className="c90-change" onClick={onChangePic}>
              <PencilIcon />
              표지 그림 바꾸기
            </button>
          )}
        </div>
        <div className="c90-info">
          <span className="c90-tag">그림일기</span>
          <div className="c90-fields">
            <p>
              <b>어른이</b>&nbsp;초등학교 <span className="c90-blank">{g && <i className="c90-hand">{g.grade}</i>}</span>
              학년 <span className="c90-blank">{g && <i className="c90-hand">{g.ban}</i>}</span>반
            </p>
            <p>
              이름 <span className="c90-blank">{name && <i className="c90-hand">{name}</i>}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 쓰는 법 한 장 (인트로 · 이 앱은요? 에서 같이 쓴다) */
export function HowTo({ step, total = HOW }: { step: number; total?: number }) {
  return (
    <section className="page intro-step" key={step}>
      <p className="intro-no">
        {step} / {total}
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
  const [picked, setKid] = useState<ReadVoice | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 이 기기에서 전에 고른 나
    setKid(kidChoice());
  }, []);
  // 남자아이·여자아이는 읽어 주는 목소리 때문에만 고른다 → 무료판(읽어 주기 끔)에선 고르지 않고 잠그지도 않는다
  const kid = READ_ALOUD ? picked : "girl";
  return (
    <section className="page intro-step">
      <h2 className="intro-h">이름표를 만들어요</h2>
      <p className="intro-p" style={{ marginTop: 0 }}>
        가입하면 일기가 서버에도 보관돼서 휴대폰을 바꿔도 그대로예요. 우리 반, 교실 뒤 게시판도 같이 쓸 수 있어요.
      </p>
      {READ_ALOUD && (
        <>
      <div className="kid-pick" role="radiogroup" aria-label="나는">
        <span className="kid-pick-label">나는</span>
        {READ_VOICES.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={kid === v.id}
            onClick={() => {
              setReadVoice(v.id);
              setKid(v.id);
            }}
          >
            {v.name}
          </button>
        ))}
      </div>
      <p className="note kid-pick-note">{kid ? "일기를 소리 내어 읽어 줄 때 이 아이 목소리로 읽어요." : "먼저 남자아이·여자아이를 골라 주세요. 일기를 읽어 줄 목소리가 돼요."}</p>
        </>
      )}
      <div className={kid ? "" : "kid-gate"} aria-disabled={kid ? undefined : true}>
        <LoginButtons next={next} />
      </div>
      <div className={`intro-guest${kid ? "" : " kid-gate"}`} aria-disabled={kid ? undefined : true}>
        <button type="button" className="linkish" onClick={onGuest} disabled={!kid}>
          로그인 없이 먼저 써 볼게요
        </button>
        <p className="note">로그인 없이 쓴 일기는 이 기기에만 저장돼요. 나중에 이름표를 만들면 그대로 합쳐져요.</p>
      </div>
    </section>
  );
}
