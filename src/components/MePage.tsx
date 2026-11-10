"use client";

// 나: 이름표(이름·나이 → 어른이 초등학교 O학년 O반) + 기록 + 개근 + 상장함

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { canvasToBlob } from "@/lib/card";
import { renderCertificate } from "@/lib/certificate";
import { useMe } from "@/lib/me";
import { READ_ALOUD } from "@/lib/business";
import { setReadVoice } from "@/lib/readAloud";
import { ageOf, birthProblem, gradeText, SCHOOL } from "@/lib/social";
import { dropDiariesOf, setDiaryOwner } from "@/lib/store";
import { BrandMark, StampSvg } from "./Icons";
import StickerBoard from "./StickerBoard";
import { LoginButtons } from "./LoginBox";
import SettingsBox from "./SettingsBox";
import Sheet from "./Sheet";

type Award = { id: string; kind: string; label: string; detail: string; rank: number | null; at: number };
const GOALS = [7, 30, 100];

/** 회원 탈퇴 (11-10): 무엇이 지워지는지 알리고, 알았다고 체크해야 누를 수 있다. 끝나면 이 기기의 내 일기장도 비운다 */
function QuitSheet({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const router = useRouter();
  const { refresh } = useMe();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/me", { method: "DELETE", json: { confirm: "탈퇴" } });
      await dropDiariesOf(userId).catch(() => {});
      setDiaryOwner(null);
      await refresh(); // 이제 손님
      onClose();
      router.push("/?cover=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "탈퇴하지 못했어요. 잠시 뒤에 다시 해 주세요");
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} label="회원 탈퇴">
      <h2>정말 탈퇴할까요?</h2>
      <p>탈퇴하면 아래가 모두 지워지고 되돌릴 수 없어요. 남기고 싶은 일기는 먼저 카드로 저장해 두세요.</p>
      <ul className="del-list">
        <li>내 일기와 그림, 게시판에 붙인 카드, 받은 도장·짝꿍 한마디</li>
        <li>오늘의 숙제 기록·사진, 칭찬 스티커, 상장</li>
        <li>이름표(이름·생년월일)와 로그인 정보</li>
        <li>우리 반에서는 빠져요. 반장이면 다음 친구가 반장이 돼요.</li>
      </ul>
      <label className="check" style={{ marginTop: 14 }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span className="box">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8.5 6.5 12 13 4" />
          </svg>
        </span>
        <span style={{ fontSize: 14 }}>모두 지워지고 되돌릴 수 없다는 걸 알았어요</span>
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="btn-row">
        <button type="button" className="btn plain" onClick={onClose} disabled={busy}>
          그만둘래요
        </button>
        <button type="button" className="btn plain erase" onClick={() => void quit()} disabled={!agree || busy}>
          {busy ? "지우는 중…" : "탈퇴하기"}
        </button>
      </div>
    </Sheet>
  );
}

export default function MePage() {
  const { me, stats, loading, refresh, logout } = useMe();
  const [edit, setEdit] = useState(false);
  const [nickname, setNickname] = useState("");
  const [birth, setBirth] = useState({ y: "", m: "", d: "" }); // 생년월일 (만 나이 → 학년·반, 생일 축하)
  const birthStr = birth.y.length === 4 && birth.m && birth.d ? `${birth.y}-${birth.m.padStart(2, "0")}-${birth.d.padStart(2, "0")}` : "";
  const previewAge = birthStr && !birthProblem(birthStr) ? ageOf({ birth: birthStr }) : null;
  const [kid, setKid] = useState<"girl" | "boy" | "">("");
  const [error, setError] = useState<string | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [cert, setCert] = useState<{ award: Award; url: string; blob: Blob } | null>(null);
  const [quit, setQuit] = useState(false); // 회원 탈퇴 확인

  useEffect(() => {
    if (!me) return;
    api<{ mine: Award[] }>("/api/awards")
      .then((r) => setAwards(r.mine))
      .catch(() => {});
  }, [me]);

  const startEdit = () => {
    if (!me) return;
    setNickname(me.nickname);
    const [y = "", m = "", d = ""] = (me.birth ?? "").split("-");
    setBirth({ y, m: m ? String(Number(m)) : "", d: d ? String(Number(d)) : "" });
    setKid(me.kid ?? "");
    setError(null);
    setEdit(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const partial = !birthStr && (birth.y || birth.m || birth.d);
    const problem = partial ? "생년월일을 끝까지 적어 주세요" : birthStr ? birthProblem(birthStr) : null;
    if (problem) return setError(problem);
    try {
      await api("/api/me", { method: "PATCH", json: { nickname, ...(birthStr ? { birth: birthStr } : {}), ...(kid ? { kid } : {}) } });
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
        <Link href="/?cover=1" className="brand">
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
              {me.age ? `${SCHOOL} ${gradeText(me.age)}` : "생년월일을 적으면 학년·반이 생겨요"}
              {me.birth && ` · 생일 ${Number(me.birth.slice(5, 7))}월 ${Number(me.birth.slice(8, 10))}일`}
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
            {!me.admin && (
              <button type="button" className="linkish" onClick={() => setQuit(true)}>
                회원 탈퇴
              </button>
            )}
          </div>
          <QuitSheet open={quit} onClose={() => setQuit(false)} userId={me.id} />
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
          <div className="nt-birth" role="group" aria-label="생년월일">
            <span>
              생년월일 (올해 나이 두 자리가 학년·반{previewAge ? ` → ${SCHOOL} ${gradeText(previewAge)}` : ", 38살이면 3학년 8반"}, 해마다 1월 1일에 진급. 다른 사람에겐 안 보여요)
            </span>
            <div className="nt-birth-row">
              <input
                inputMode="numeric"
                value={birth.y}
                maxLength={4}
                placeholder="1988"
                aria-label="태어난 해"
                onChange={(e) => setBirth((b) => ({ ...b, y: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
              />
              년
              <input
                inputMode="numeric"
                value={birth.m}
                maxLength={2}
                placeholder="3"
                aria-label="태어난 달"
                onChange={(e) => setBirth((b) => ({ ...b, m: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
              />
              월
              <input
                inputMode="numeric"
                value={birth.d}
                maxLength={2}
                placeholder="14"
                aria-label="태어난 날"
                onChange={(e) => setBirth((b) => ({ ...b, d: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
              />
              일
            </div>
          </div>
          {READ_ALOUD && (
            <label>
              나는 (일기를 이 아이 목소리로 읽어 줘요)
              <select value={kid} onChange={(e) => setKid(e.target.value as "girl" | "boy" | "")}>
                {!kid && <option value="">골라 주세요</option>}
                <option value="girl">여자아이</option>
                <option value="boy">남자아이</option>
              </select>
            </label>
          )}
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
