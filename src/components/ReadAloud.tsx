"use client";

// 다 쓴 일기를 아이 목소리로 소리 내어 읽기 (여자아이 수아 · 남자아이 태지, Typecast)
// 목소리는 가입할 때 고른 나(이름표의 남자아이·여자아이)로만 읽는다 — 따로 고르는 단추 없음 (11-09 사용자).
// 서버에 목소리 키가 없으면 아무것도 안 보인다.

import { useEffect, useRef, useState } from "react";
import { getReading, readAloudOn, voiceFor, type ReadInput } from "@/lib/readAloud";
import { useMe } from "@/lib/me";

const SORRY: Record<string, string> = {
  too_many: "목이 조금 쉬었어요. 잠시 뒤에 다시 읽어 볼게요",
  month_limit: "이번 달 목소리를 다 썼어요. 다음 달에 다시 읽어요",
  credits: "이번 달 목소리를 다 썼어요. 다음 달에 다시 읽어요",
};

export default function ReadAloud({ diary }: { diary: ReadInput }) {
  const { me } = useMe();
  const [on, setOn] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);

  const stop = () => {
    audio.current?.pause();
    audio.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setState("idle");
  };

  useEffect(() => {
    let alive = true;
    void readAloudOn().then((v) => alive && setOn(v));
    return () => {
      alive = false;
      audio.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);

  if (!on || (!diary.title.trim() && !diary.body.trim())) return null;

  const play = async () => {
    if (state === "playing" || state === "loading") return stop();
    setMsg(null);
    setState("loading");
    try {
      const blob = await getReading(diary, voiceFor(me?.kid));
      const u = URL.createObjectURL(blob);
      const a = new Audio(u);
      url.current = u;
      audio.current = a;
      a.onended = stop;
      await a.play();
      setState("playing");
    } catch (e) {
      stop();
      setMsg(SORRY[(e as Error).message] ?? "목소리를 못 불러왔어요. 잠시 뒤에 다시 눌러 주세요");
    }
  };

  return (
    <div className="read-aloud">
      <button type="button" className={`ra-play ${state}`} onClick={() => void play()} aria-pressed={state === "playing"}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {state === "playing" ? (
            <path d="M8 6.5v11M16 6.5v11" />
          ) : (
            <>
              <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
              <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
            </>
          )}
        </svg>
        {state === "loading" ? "목소리 고르는 중" : state === "playing" ? "그만 읽기" : "소리 내어 읽기"}
        {state === "loading" && <span className="dots" />}
      </button>
      {msg && (
        <p className="ra-msg" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
