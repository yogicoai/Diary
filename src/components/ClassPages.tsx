"use client";

// 우리 반: 내 반 목록·만들기·초대 코드로 들어가기 / 반 피드 / 초대 링크로 들어오기

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { shortDate } from "@/lib/date";
import { useMe } from "@/lib/me";
import type { Stroke } from "@/lib/crayon";
import { renderThumb } from "@/lib/thumb";
import { pencilTick } from "@/lib/feel";
import { BrandMark, StampSvg } from "./Icons";
import { LoginButtons } from "./LoginBox";
import { StickerSvg } from "./PraiseStickers";
import Reactions from "./Reactions";

type ClassLite = { id: string; name: string; code: string; members: number; owner: boolean };

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="topbar">
      <Link href="/class" className="brand">
        <BrandMark className="brand-mark" />
        <span>
          <span className="brand-name">{title}</span>
          <span className="brand-sub">{sub}</span>
        </span>
      </Link>
    </header>
  );
}

function NeedLogin({ next, why }: { next: string; why: string }) {
  return (
    <div className="empty" style={{ textAlign: "left" }}>
      <p style={{ margin: "0 0 12px", textAlign: "center" }}>{why}</p>
      <LoginButtons next={next} />
    </div>
  );
}

export function ClassList() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassLite[] | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    api<{ classes: ClassLite[] }>("/api/classes")
      .then((r) => setClasses(r.classes))
      .catch(() => setClasses([]));
  }, [me]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const r = await api<{ class: ClassLite }>("/api/classes", { method: "POST", json: { name } });
      router.push(`/class/${r.class.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "반을 못 만들었어요");
    }
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const r = await api<{ class: ClassLite }>("/api/classes/join", { method: "POST", json: { code } });
      router.push(`/class/${r.class.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "들어가지 못했어요");
    }
  };

  return (
    <main className="app">
      <Header title="우리 반" sub="친구·연인·가족끼리 일기를 바꿔 봐요" />
      {loading && <div className="empty">…</div>}
      {!loading && !me && <NeedLogin next="/class" why="반을 만들거나 들어가려면 이름표가 필요해요." />}
      {me && (
        <>
          {classes === null && <div className="empty">반을 찾는 중…</div>}
          {classes?.length === 0 && <p className="note">아직 들어간 반이 없어요. 반을 만들고 초대 링크를 보내 보세요.</p>}
          <div className="class-list">
            {classes?.map((c) => (
              <Link key={c.id} href={`/class/${c.id}`} className="class-card">
                <b>{c.name}</b>
                <span>
                  친구 {c.members}명{c.owner ? " · 반장" : ""}
                </span>
              </Link>
            ))}
          </div>

          <h2 className="section-title">새 반 만들기</h2>
          <form className="inline-form" onSubmit={create}>
            <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="예) 우리 가족, 입사 동기" aria-label="반 이름" />
            <button type="submit" className="btn" disabled={!name.trim()}>
              만들기
            </button>
          </form>

          <h2 className="section-title">초대 코드로 들어가기</h2>
          <form className="inline-form" onSubmit={join}>
            <input value={code} maxLength={8} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="6자리 코드" aria-label="초대 코드" />
            <button type="submit" className="btn plain" disabled={code.length < 6}>
              들어가기
            </button>
          </form>
          {error && <p className="form-error">{error}</p>}
        </>
      )}
    </main>
  );
}

type Note = { id: string; who: string; text: string; mine: boolean };

type FeedItem = {
  id: string;
  date: string;
  title: string;
  body: string;
  secret: boolean;
  strokes: Stroke[];
  bg: string | null;
  teacher: string;
  stickers?: string[];
  nameTag: string;
  reactions: Partial<Record<string, number>>;
  mine: boolean;
  myReactions: string[];
  notes: Note[];
};

type Member = { id: string; nameTag: string; handedIn: boolean; me: boolean };
type ClassData = { today: string; class: ClassLite; homework: string | null; members: Member[]; feed: FeedItem[] };

function FeedThumb({ item }: { item: FeedItem }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    renderThumb(item, 480, 360).then((c) => alive && setSrc(c.toDataURL("image/webp", 0.8)));
    return () => {
      alive = false;
    };
  }, [item]);
  // eslint-disable-next-line @next/next/no-img-element
  return <div className="feed-thumb">{src && <img src={src} alt="" />}</div>;
}

/** 짝꿍 한마디: 반 친구 일기에 빨간 색연필 한 줄 */
function Notes({ diaryId, initial, onToast }: { diaryId: string; initial: Note[]; onToast: (m: string) => void }) {
  const [list, setList] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const r = await api<{ note: Note }>("/api/notes", { method: "POST", json: { diaryId, text } });
      setList((l) => [...l, r.note]);
      setText("");
      pencilTick();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "남기지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await api(`/api/notes?id=${id}`, { method: "DELETE" }).catch(() => {});
    setList((l) => l.filter((n) => n.id !== id));
  };

  return (
    <div className="notes">
      {list.map((n) => (
        <p key={n.id} className="note-line">
          <b>{n.who}</b> {n.text}
          {n.mine && (
            <button type="button" className="note-x" aria-label="내 한마디 지우기" onClick={() => remove(n.id)}>
              ×
            </button>
          )}
        </p>
      ))}
      <form className="note-form" onSubmit={send}>
        <input value={text} maxLength={40} onChange={(e) => setText(e.target.value)} placeholder="짝꿍 한마디 (40자)" aria-label="짝꿍 한마디" />
        <button type="submit" className="tool" disabled={!text.trim() || busy}>
          남기기
        </button>
      </form>
    </div>
  );
}

export function ClassFeed({ id }: { id: string }) {
  const { me, loading } = useMe();
  const router = useRouter();
  const [data, setData] = useState<ClassData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hw, setHw] = useState("");
  const [hwEdit, setHwEdit] = useState(false);

  useEffect(() => {
    if (!me) return;
    api<ClassData>(`/api/classes/${id}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "반을 못 열었어요"));
  }, [id, me]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const invite = async () => {
    if (!data) return;
    const link = `${location.origin}/join/${data.class.code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${data.class.name} 반에 들어와요`, text: "같이 그림일기 써요", url: link });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    await navigator.clipboard.writeText(link).catch(() => {});
    setToast("초대 링크를 복사했어요");
  };

  const leave = async () => {
    if (!confirm("이 반에서 나갈까요? 내가 보낸 일기도 반에서 빠져요.")) return;
    await api(`/api/classes/${id}`, { method: "DELETE" }).catch(() => {});
    router.push("/class");
  };

  const saveHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await api<{ homework: string | null }>(`/api/classes/${id}/homework`, { method: "POST", json: { text: hw } });
      setData((d) => (d ? { ...d, homework: r.homework } : d));
      setHwEdit(false);
      setToast(r.homework ? "반 숙제를 냈어요" : "반 숙제를 지웠어요");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "숙제를 못 냈어요");
    }
  };

  const done = data?.members.filter((m) => m.handedIn).length ?? 0;
  const iDid = !!data?.members.find((m) => m.me)?.handedIn;

  return (
    <main className="app">
      <Header title={data?.class.name ?? "우리 반"} sub={data ? `친구 ${data.members.length}명 · 초대 코드 ${data.class.code}` : ""} />
      {!loading && !me && <NeedLogin next={`/class/${id}`} why="반 친구만 볼 수 있어요." />}
      {error && <div className="empty">{error}</div>}
      {data && (
        <>
          {/* 반 숙제 */}
          <section className="homework">
            <span className="hw-label">오늘의 반 숙제</span>
            {hwEdit ? (
              <form className="inline-form" onSubmit={saveHomework} style={{ marginTop: 8 }}>
                <input value={hw} maxLength={30} onChange={(e) => setHw(e.target.value)} placeholder="예) 오늘 점심 메뉴 그리기" aria-label="반 숙제" />
                <button type="submit" className="btn">
                  내기
                </button>
              </form>
            ) : (
              <p className="hw-text">{data.homework ?? (data.class.owner ? "아직 숙제를 안 냈어요. 반장님, 오늘 숙제를 내 주세요!" : "반장님이 아직 숙제를 안 냈어요. 자유 주제예요.")}</p>
            )}
            <div className="hw-actions">
              {data.class.owner && !hwEdit && (
                <button
                  type="button"
                  className="linkish"
                  onClick={() => {
                    setHw(data.homework ?? "");
                    setHwEdit(true);
                  }}
                >
                  {data.homework ? "숙제 바꾸기" : "숙제 내기"}
                </button>
              )}
              <Link href={`/?class=${id}`} className="btn" style={{ marginTop: 0, minHeight: 44, fontSize: 18 }}>
                {iDid ? "한 장 더 내기" : "숙제하러 가기"}
              </Link>
            </div>
          </section>

          {/* 출석부 */}
          <section className="attendance" aria-label={`오늘 ${done}/${data.members.length}명 냈어요`}>
            <div className="att-head">
              <b>출석부</b>
              <span>
                오늘 {done}/{data.members.length}명 냈어요
              </span>
            </div>
            <div className="att-grid">
              {data.members.map((m) => (
                <div key={m.id} className={`att${m.handedIn ? " in" : ""}`}>
                  <span className="att-slot">{m.handedIn && <StampSvg />}</span>
                  <span className="att-name">
                    {m.nameTag.split(" ").slice(-1)[0]}
                    {m.me ? " (나)" : ""}
                  </span>
                </div>
              ))}
            </div>
            {done < data.members.length && <p className="att-nudge">{done === 0 ? "아직 아무도 안 냈어요. 첫 번째로 내 볼까요?" : "아직 안 낸 친구가 있어요. 콕 찔러 볼까요?"}</p>}
          </section>

          <div className="btn-row">
            <button type="button" className="btn plain" onClick={invite}>
              친구 초대하기
            </button>
            <button type="button" className="btn plain" onClick={leave}>
              반에서 나가기
            </button>
          </div>

          {data.feed.length === 0 && <div className="empty">아직 반에 낸 일기가 없어요. 오늘 숙제를 내 볼까요?</div>}
          <div className="feed">
            {data.feed.map((it) => (
              <article key={it.id} className="feed-item">
                <div className="feed-head">
                  <b>{it.nameTag}</b>
                  <span>{shortDate(it.date)}</span>
                </div>
                <FeedThumb item={it} />
                <h3>{it.title || "제목 없는 날"}</h3>
                {it.secret ? <p className="muted">비밀 일기라 글은 가렸어요</p> : <p>{it.body}</p>}
                {it.teacher && <p className="feed-teacher">{it.teacher}</p>}
                {!!it.stickers?.length && (
                  <div className="feed-stickers">
                    {it.stickers.map((sid) => (
                      <StickerSvg key={sid} id={sid} size={44} />
                    ))}
                  </div>
                )}
                {!it.mine && <Reactions diaryId={it.id} initial={it.reactions} mine={it.myReactions} canReact onToast={setToast} />}
                <Notes diaryId={it.id} initial={it.notes} onToast={setToast} />
              </article>
            ))}
          </div>
        </>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}

export function JoinClass({ code }: { code: string }) {
  const { me, loading } = useMe();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    api<{ class: { id: string } }>("/api/classes/join", { method: "POST", json: { code } })
      .then((r) => router.replace(`/class/${r.class.id}`))
      .catch((e) => setError(e instanceof Error ? e.message : "들어가지 못했어요"));
  }, [me, code, router]);

  return (
    <main className="app">
      <Header title="반 초대장" sub={`초대 코드 ${code}`} />
      {!loading && !me && <NeedLogin next={`/join/${code}`} why="친구가 반에 초대했어요. 이름표를 만들고 들어가요." />}
      {me && !error && <div className="empty">반에 들어가는 중…</div>}
      {error && <div className="empty">{error}</div>}
    </main>
  );
}
