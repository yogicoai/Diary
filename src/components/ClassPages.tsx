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
import { BrandMark } from "./Icons";
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
};

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

export function ClassFeed({ id }: { id: string }) {
  const { me, loading } = useMe();
  const router = useRouter();
  const [data, setData] = useState<{ class: ClassLite; members: { id: string; nameTag: string }[]; feed: FeedItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    api<typeof data & object>(`/api/classes/${id}`)
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

  return (
    <main className="app">
      <Header title={data?.class.name ?? "우리 반"} sub={data ? `친구 ${data.members.length}명 · 초대 코드 ${data.class.code}` : ""} />
      {!loading && !me && <NeedLogin next={`/class/${id}`} why="반 친구만 볼 수 있어요." />}
      {error && <div className="empty">{error}</div>}
      {data && (
        <>
          <div className="btn-row" style={{ marginTop: -6 }}>
            <button type="button" className="btn" onClick={invite}>
              친구 초대하기
            </button>
            <Link href="/" className="btn plain">
              일기 쓰고 보내기
            </Link>
          </div>
          <div className="member-chips">
            {data.members.map((m) => (
              <span key={m.id} className="chip">
                {m.nameTag}
              </span>
            ))}
          </div>
          {data.feed.length === 0 && <div className="empty">아직 보낸 일기가 없어요. 오늘 일기를 써서 보내 볼까요?</div>}
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
                    {it.stickers.map((id) => (
                      <StickerSvg key={id} id={id} size={44} />
                    ))}
                  </div>
                )}
                {!it.mine && (
                  <Reactions diaryId={it.id} initial={it.reactions} mine={it.myReactions} canReact onToast={setToast} />
                )}
              </article>
            ))}
          </div>
          <p className="note" style={{ textAlign: "center" }}>
            <button type="button" className="linkish" onClick={leave}>
              이 반에서 나가기
            </button>
          </p>
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
