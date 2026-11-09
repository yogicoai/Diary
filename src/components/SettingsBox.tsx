"use client";

// "나" → 기본 설정: 일기장(테마) / 새 일기의 처음 배경 / 선생님이 직접 읽기(AI 동의)

import { useEffect, useState } from "react";
import { BACKGROUNDS, bgThumb } from "@/lib/backgrounds";
import { preferredBg, setPreferredBg, setWebBg, WEB_BGS, webBg, type WebBgId } from "@/lib/prefs";
import { hapticOn, setHaptic, setSound, soundOn } from "@/lib/feel";
import { getConsent, setConsent, type Consent } from "@/lib/teacherAi";
import { readAloudOn, readVoice, setReadVoice } from "@/lib/readAloud";
import { READ_VOICES, type ReadVoice } from "@/lib/readScript";
import { PencilIcon } from "./Icons";
import ThemePicker from "./ThemePicker";

export default function SettingsBox() {
  const [bg, setBg] = useState<string | null | undefined>(undefined);
  const [consent, setC] = useState<Consent>(null);
  const [web, setWeb] = useState<WebBgId>("theme");
  const [sound, setSnd] = useState(true);
  const [haptic, setHap] = useState(true);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voice, setVoice] = useState<ReadVoice>("girl");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 이 기기 설정을 한 번 읽는다
    setBg(preferredBg());
    setC(getConsent());
    setWeb(webBg());
    setSnd(soundOn());
    setHap(hapticOn());
    setVoice(readVoice());
    let alive = true;
    void readAloudOn().then((v) => alive && setVoiceOn(v));
    return () => {
      alive = false;
    };
  }, []);

  const pickBg = (id: string | null) => {
    setPreferredBg(id);
    setBg(id);
  };

  return (
    <section className="settings" aria-label="기본 설정">
      <h2 className="section-title">기본 설정</h2>

      <h3 className="set-title">일기장</h3>
      <ThemePicker />

      <h3 className="set-title">새 일기의 처음 배경</h3>
      <div className="bg-tray wrap" role="radiogroup" aria-label="처음 배경">
        <button type="button" role="radio" aria-checked={bg === null} className="bg-tile blank" onClick={() => pickBg(null)}>
          <span className="bg-thumb">
            <PencilIcon />
          </span>
          <span className="bg-name">직접 그리기</span>
        </button>
        {BACKGROUNDS.map((b) => (
          <button key={b.id} type="button" role="radio" aria-checked={bg === b.id} className="bg-tile" onClick={() => pickBg(b.id)}>
            <span className="bg-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bgThumb(b.id)} alt="" loading="lazy" />
            </span>
            <span className="bg-name">{b.name}</span>
          </button>
        ))}
      </div>

      <h3 className="set-title">넓은 화면(PC) 일기장 뒤 배경</h3>
      <div className="web-bgs" role="radiogroup" aria-label="넓은 화면 배경">
        {WEB_BGS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={web === b.id}
            className={`web-bg ${b.id}`}
            onClick={() => {
              setWebBg(b.id);
              setWeb(b.id);
            }}
          >
            <span className="wb-thumb" />
            <span className="bg-name">{b.name}</span>
          </button>
        ))}
      </div>

      <h3 className="set-title">소리·진동</h3>
      <div className="set-toggles">
        <label className="check set-check">
          <input type="checkbox" checked={sound} onChange={(e) => (setSound(e.target.checked), setSnd(e.target.checked))} />
          <span className="box">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8.5 6.5 12 13 4" />
            </svg>
          </span>
          <span>
            소리
            <small>크레파스 사각사각, 연필 톡, 도장 쿵</small>
          </span>
        </label>
        <label className="check set-check">
          <input type="checkbox" checked={haptic} onChange={(e) => (setHaptic(e.target.checked), setHap(e.target.checked))} />
          <span className="box">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8.5 6.5 12 13 4" />
            </svg>
          </span>
          <span>
            진동
            <small>그을 때 손끝 느낌 (안드로이드)</small>
          </span>
        </label>
      </div>

      {voiceOn && (
        <>
          <h3 className="set-title">일기 읽어 주는 아이</h3>
          <div className="ra-voices" role="radiogroup" aria-label="읽어 주는 아이">
            {READ_VOICES.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={voice === v.id}
                className="ra-voice"
                onClick={() => {
                  setReadVoice(v.id);
                  setVoice(v.id);
                }}
              >
                {v.name}
              </button>
            ))}
          </div>
        </>
      )}

      <h3 className="set-title">선생님이 직접 읽기</h3>
      <label className="check set-check">
        <input
          type="checkbox"
          checked={consent === "yes"}
          onChange={(e) => {
            const v = e.target.checked ? "yes" : "no";
            setConsent(v);
            setC(v);
          }}
        />
        <span className="box">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8.5 6.5 12 13 4" />
          </svg>
        </span>
        <span>
          AI(Anthropic의 Claude)가 일기를 읽고 선생님 한 줄을 써요
          <small>끄면 미리 준비된 한 줄로 도장을 찍어요. 켜면 일기 글이 미국 서버로 보내져요.</small>
        </span>
      </label>
    </section>
  );
}
