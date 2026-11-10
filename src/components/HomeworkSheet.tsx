"use client";

// 숙제 하기 (11-09 사용자: "숙제는 따로, 사진이나 한 줄로 인증하면 달아 주기").
// 오늘의 숙제(어른이 미션)를 하고 사진 한 장이나 한 줄로 낸다 → 선생님 '검사 끝' 도장 + 숙제 스티커 1장(칭찬 스티커판, 달마다 새 판).
// 숙제 검사는 이름표(구글 로그인)가 있어야 받는다. 게시판 '오늘의 숙제'에 보여 주기는 고른 사람만 (사진은 AI 검사 뒤).

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { buzz, stampThump } from "@/lib/feel";
import { submitHomework, type HomeworkDay, type HomeworkResult } from "@/lib/homework";
import { useMe } from "@/lib/me";
import { StampSvg } from "./Icons";
import { LoginButtons } from "./LoginBox";
import { StickerSvg } from "./PraiseStickers";
import Sheet from "./Sheet";

export default function HomeworkSheet({ open, onClose, day, onDone }: { open: boolean; onClose: () => void; day: HomeworkDay | null; onDone: () => void }) {
  const { me } = useMe();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<HomeworkResult | null>(null);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 미리보기 주소 정리
  useEffect(() => {
    if (!photo) return;
    const u = URL.createObjectURL(photo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 고른 사진의 미리보기 주소
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  if (!day) return null;
  const mine = day.mine;
  const mission = day.mission;

  const close = () => {
    setResult(null);
    setEditing(false);
    setErr(null);
    onClose();
  };

  const startEdit = () => {
    setText(mine?.text ?? "");
    setShare(mine?.share ?? false);
    setPhoto(null);
    setPreview(null);
    setEditing(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await submitHomework({ date: day.date, text, share, photo });
      stampThump();
      buzz(30);
      setResult(r);
      setEditing(false);
      setPhoto(null);
      setPreview(null);
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "숙제를 못 냈어요. 잠시 뒤에 다시 해 주세요");
    } finally {
      setBusy(false);
    }
  };

  const head = (
    <div className="hw-head">
      <span className={`tb-label${mission.kind === "teacher" ? " by-teacher" : ""}`}>{mission.kind === "teacher" ? "선생님 숙제" : "오늘의 숙제"}</span>
      <h2 className="hw-mission">{mission.text}</h2>
      {mission.note && <p className="tb-note">{mission.note}</p>}
    </div>
  );

  // 1) 이름표가 없으면
  if (!me) {
    return (
      <Sheet open={open} onClose={close} label="숙제 하기">
        {head}
        <p className="hw-lead">숙제 검사는 이름표를 만든 뒤에 받을 수 있어요. 숙제를 내면 선생님이 &lsquo;검사 끝&rsquo; 도장을 찍고 칭찬 스티커를 줘요.</p>
        <LoginButtons next="/" />
      </Sheet>
    );
  }

  // 2) 방금 냈으면: 검사 끝 도장 + 스티커
  if (result) {
    const month = Number(result.homework.date.slice(5, 7));
    return (
      <Sheet open={open} onClose={close} label="숙제 검사 끝">
        <div className="hw-done">
          <StampSvg className="hw-stamp" stamp="checked" />
          <p className="hw-done-title">숙제 검사 끝!</p>
          {result.first ? (
            <div className="hw-got">
              <span className="hw-got-sticker">
                <StickerSvg id={result.homework.sticker} size={88} />
              </span>
              <p>
                숙제 스티커 1장을 받았어요.
                <br />
                {month}월 칭찬 스티커판 <b>{result.monthCount ?? 1}장</b>
              </p>
            </div>
          ) : (
            <p className="hw-lead">고친 숙제로 다시 검사했어요.</p>
          )}
          {result.awards.map((a) => (
            <p key={a.label} className="hw-award">
              상장을 받았어요: <b>{a.label}</b>
            </p>
          ))}
          {result.homework.share && result.homework.status === "pending" && <p className="note">게시판에는 선생님이 확인한 뒤에 보여요.</p>}
          <div className="btn-row">
            <Link href="/me#stickers" className="btn plain" onClick={close}>
              스티커판 보기
            </Link>
            <button type="button" className="btn" onClick={close}>
              닫기
            </button>
          </div>
        </div>
      </Sheet>
    );
  }

  // 3) 이미 낸 숙제 보기
  if (mine && !editing) {
    return (
      <Sheet open={open} onClose={close} label="오늘 낸 숙제">
        {head}
        <div className="hw-proof mine">
          {mine.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mine.photoUrl} alt="내가 낸 숙제 사진" />
          )}
          {mine.text && <p className="hw-proof-text">{mine.text}</p>}
          <StampSvg className="hw-proof-stamp" stamp="checked" />
        </div>
        <p className="note">
          {mine.share ? (mine.status === "visible" ? "게시판 '오늘의 숙제'에 보여 주는 중이에요." : mine.status === "pending" ? "게시판에는 선생님이 확인한 뒤에 보여요." : "게시판에서는 내려갔어요.") : "나만 보는 숙제예요."}
        </p>
        <div className="btn-row">
          <button type="button" className="btn plain" onClick={startEdit}>
            고쳐서 다시 내기
          </button>
          <button type="button" className="btn" onClick={close}>
            닫기
          </button>
        </div>
      </Sheet>
    );
  }

  // 4) 숙제 내기
  const canSend = !!photo || !!text.trim() || (editing && !!mine?.photoUrl);
  return (
    <Sheet open={open} onClose={close} label="숙제 하기">
      {head}
      <form className="hw-form" onSubmit={(e) => void submit(e)}>
        <button type="button" className={`hw-photo${preview || (editing && mine?.photoUrl) ? " has" : ""}`} onClick={() => fileRef.current?.click()}>
          {preview || (editing && mine?.photoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview ?? mine?.photoUrl ?? ""} alt="숙제 사진 미리보기" />
          ) : (
            <span>
              <b>사진 한 장 붙이기</b>
              <small>카메라나 앨범에서 골라요</small>
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPhoto(f);
            e.target.value = "";
          }}
        />
        <input className="hw-text" value={text} maxLength={60} onChange={(e) => setText(e.target.value)} placeholder="한 줄로 숙제 검사 받기 (예: 빼빼로 줬더니 짝꿍이 웃었다)" aria-label="한 줄 숙제" />
        <label className="check hw-share">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
          <span className="box">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8.5 6.5 12 13 4" />
            </svg>
          </span>
          <span>
            게시판 &lsquo;오늘의 숙제&rsquo;에 보여 주기
            <small>다른 어른이들도 구경해요. 보여 주기 전에 AI(미국 Anthropic)가 사진·한 줄을 검사해요. 얼굴·이름이 나온 사진은 조심!</small>
          </span>
        </label>
        {err && (
          <p className="note hw-err" role="alert">
            {err}
          </p>
        )}
        <button type="submit" className="btn" disabled={busy || !canSend}>
          {busy ? "선생님이 검사하는 중…" : editing ? "다시 내기" : "숙제 내기"}
        </button>
      </form>
    </Sheet>
  );
}
