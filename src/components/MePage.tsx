"use client";

// 나: 이름표(이름·나이 → 어른이 초등학교 O학년 O반) + 기록 + 개근 + 상장함

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { canvasToBlob } from "@/lib/card";
import { renderCertificate } from "@/lib/certificate";
import { useMe } from "@/lib/me";
import { setReadVoice } from "@/lib/readAloud";
import { gradeText, SCHOOL } from "@/lib/social";
import { BrandMark, StampSvg } from "./Icons";
import StickerBoard from "./StickerBoard";
import { LoginButtons } from "./LoginBox";
import SettingsBox from "./SettingsBox";
import Sheet from "./Sheet";

type Award = { id: string; kind: string; label: string; detail: string; rank: number | null; at: number };
const GOALS = [7, 30, 100];

export default function MePage() {
  const { me, stats, loading, refresh, logout } = useMe();
  const [edit, setEdit] = useState(false);
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [kid, setKid] = useState<"girl" | "boy" | "">("");
  const [error, setError] = useState<string | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [cert, setCert] = useState<{ award: Award; url: string; blob: Blob } | null>(null);

  useEffect(() => {
    if (!me) return;
    api<{ mine: Award[] }>("/api/awards")
      .then((r) => setAwards(r.mine))
      .catch(() => {});
  }, [me]);

  const startEdit = () => {
    if (!me) return;
    setNickname(me.nickname);
    setAge(me.age ? String(me.age) : "");
    setKid(me.kid ?? "");
    setError(null);
    setEdit(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/me", { method: "PATCH", json: { nickname, age: age ? Number(age) : null, ...(kid ? { kid } : {}) } });
      if (kid) setReadVoice(kid);
      await refresh();
      setEdit(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "고치지 못했어요");
    }
  };

  const openCert = async (a: Award) => {
    if (!me) return;
    const c = await renderCertificate({ label: a.label, detail: a.detail, nameTag: me.nameTag, at: a.at });
    const blob = await canvasToBlob(c);
    setCert({ award: a, url: URL.createObjectURL(blob), blob });
  };

  const shareCert = async () => {
    if (!cert) return;
    const file = new File([cert.blob], `상장-${cert.award.label}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: cert.award.label });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    const a = document.createElement("a");
    a.href = cert.url;
    a.download = file.name;
    a.click();
  };

  const streak = stats?.streak ?? 0;
  const goal = GOALS.find((g) => g > streak) ?? null;

  return (
    <main className="app">
      <header className="topbar">
        <Link href="/" className="brand">
          <BrandMark className="brand-mark" />
          <span>
            <span className="brand-name">나</span>
            <span className="brand-sub">이름표와 상장함</span>
          </span>
        </Link>
      </header>

      {loading && <div className="empty">…</div>}
      {!loading && !me && (
        <div className="empty" style={{ textAlign: "left" }}>
          <p style={{ margin: "0 0 6px", textAlign: "center" }}>이름표를 만들면</p>
          <ul className="perks">
            <li>교실 뒤 게시판에 일기를 붙이고 친구들 도장을 받아요</li>
            <li>우리 반을 만들어 친구·가족과 일기를 바꿔 봐요</li>
            <li>개근상·참 잘한 일기 상장을 받아요</li>
            <li>휴대폰을 바꿔도 일기가 그대로예요</li>
          </ul>
          <LoginButtons next="/me" />
        </div>
      )}

      {me && (
        <>
          <section className="nametag">
            <span className="nt-hole" aria-hidden="true" />
            <span className="nt-label">이름표</span>
            <b className="nt-name">{me.nickname}</b>
            <span className="nt-sub">{me.age ? `${SCHOOL} ${gradeText(me.age)}` : "나이를 적으면 학년·반이 생겨요"}</span>
            <button type="button" className="linkish nt-edit" onClick={startEdit}>
              고치기
            </button>
          </section>

          <div className="stats">
            <div>
              <b>{stats?.diaries ?? 0}</b>
              <span>쓴 일기</span>
            </div>
            <div>
              <b>{stats?.stamps ?? 0}</b>
              <span>받은 도장</span>
            </div>
            <div>
              <b>{stats?.board ?? 0}</b>
              <span>게시판</span>
            </div>
            <div>
              <b>{streak}일</b>
              <span>연속</span>
            </div>
          </div>
          {goal && (
            <div className="goal">
              <span>
                {goal === 7 ? "일주일" : goal === 30 ? "한 달" : "백일"} 개근상까지 {goal - streak}일
              </span>
              <span className="goal-bar">
                <span style={{ width: `${Math.min(100, (streak / goal) * 100)}%` }} />
              </span>
            </div>
          )}

          <StickerBoard />

          <h2 className="section-title">상장함</h2>
          {awards.length === 0 ? (
            <p className="note">7일 동안 빠짐없이 쓰면 첫 개근상을 받아요. 오늘의 숙제를 10번 하면 숙제 상장, 게시판에서 도장을 많이 받으면 &quot;참 잘한 일기&quot; 상도 받아요.</p>
          ) : (
            <div className="award-grid">
              {awards.map((a) => (
                <button key={a.id} type="button" className="award" onClick={() => openCert(a)}>
                  <StampSvg className="award-stamp" />
                  <b>{a.label}</b>
                  <span>{new Date(a.at).toLocaleDateString("ko-KR")}</span>
                </button>
              ))}
            </div>
          )}

          <div className="me-links">
            {me.admin && <Link href="/admin">교무실</Link>}
            <button type="button" className="linkish" onClick={() => logout()}>
              로그아웃
            </button>
          </div>
        </>
      )}

      {!loading && <SettingsBox />}

      <Sheet open={edit} onClose={() => setEdit(false)} label="이름표 고치기">
        <h2>이름표 고치기</h2>
        <form className="nt-form" onSubmit={save}>
          <label>
            이름 (게시판·우리 반에 보여요, 별명으로 바꿔도 돼요)
            <input value={nickname} maxLength={8} onChange={(e) => setNickname(e.target.value)} />
          </label>
          <label>
            나이 (두 자리가 학년·반이 돼요{gradeText(Number(age)) ? ` → ${SCHOOL} ${gradeText(Number(age))}` : ", 38살이면 3학년 8반"})
            <input
              inputMode="numeric"
              value={age}
              maxLength={2}
              placeholder="예: 38"
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
          </label>
          <label>
            나는 (일기를 이 아이 목소리로 읽어 줘요)
            <select value={kid} onChange={(e) => setKid(e.target.value as "girl" | "boy" | "")}>
              {!kid && <option value="">골라 주세요</option>}
              <option value="girl">여자아이</option>
              <option value="boy">남자아이</option>
            </select>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn">
            저장
          </button>
        </form>
      </Sheet>

      <Sheet open={!!cert} onClose={() => setCert(null)} label="상장">
        {cert && (
          <>
            <h2>{cert.award.label}</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="card-preview" src={cert.url} alt={`${cert.award.label} 상장`} />
            <button type="button" className="btn" onClick={shareCert}>
              상장 자랑하기
            </button>
          </>
        )}
      </Sheet>
    </main>
  );
}
