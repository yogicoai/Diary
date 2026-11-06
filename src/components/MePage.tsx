"use client";

// 나: 이름표(닉네임·입학 연도·반) + 기록 + 개근 + 상장함

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { canvasToBlob } from "@/lib/card";
import { renderCertificate } from "@/lib/certificate";
import { useMe } from "@/lib/me";
import { BrandMark, StampSvg } from "./Icons";
import { LoginButtons } from "./LoginBox";
import Sheet from "./Sheet";

type Award = { id: string; kind: string; label: string; detail: string; rank: number | null; at: number };
const YEARS = Array.from({ length: 2020 - 1965 + 1 }, (_, i) => 2020 - i);
const GOALS = [7, 30, 100];

export default function MePage() {
  const { me, stats, loading, refresh, logout } = useMe();
  const [edit, setEdit] = useState(false);
  const [nickname, setNickname] = useState("");
  const [entryYear, setEntryYear] = useState<string>("");
  const [classNo, setClassNo] = useState(1);
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
    setEntryYear(me.entryYear ? String(me.entryYear) : "");
    setClassNo(me.classNo);
    setError(null);
    setEdit(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/me", { method: "PATCH", json: { nickname, entryYear: entryYear ? Number(entryYear) : null, classNo } });
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
            <span className="nt-sub">
              {me.entryYear ? `${me.entryYear}년 입학 · ` : "입학 연도를 적어 주세요 · "}
              {me.classNo}반
            </span>
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

          <h2 className="section-title">상장함</h2>
          {awards.length === 0 ? (
            <p className="note">7일 동안 빠짐없이 쓰면 첫 개근상을 받아요. 게시판에서 도장을 많이 받으면 &quot;참 잘한 일기&quot; 상도 받아요.</p>
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
            {me.admin && <Link href="/admin">선생님 확인함 (관리)</Link>}
            <button type="button" className="linkish" onClick={() => logout()}>
              로그아웃
            </button>
          </div>
        </>
      )}

      <Sheet open={edit} onClose={() => setEdit(false)} label="이름표 고치기">
        <h2>이름표 고치기</h2>
        <form className="nt-form" onSubmit={save}>
          <label>
            이름 (게시판에 보여요, 실명 말고 별명)
            <input value={nickname} maxLength={8} onChange={(e) => setNickname(e.target.value)} />
          </label>
          <label>
            초등학교 입학 연도 (같은 해 입학한 친구를 찾아요)
            <select value={entryYear} onChange={(e) => setEntryYear(e.target.value)}>
              <option value="">비밀이에요</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
          </label>
          <label>
            반
            <select value={classNo} onChange={(e) => setClassNo(Number(e.target.value))}>
              {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}반
                </option>
              ))}
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
