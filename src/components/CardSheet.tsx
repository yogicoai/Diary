"use client";

import { useEffect, useState } from "react";
import { canvasToBlob, renderCard } from "@/lib/card";
import { track, type Diary } from "@/lib/store";
import Sheet from "./Sheet";

// 공유 카드 미리보기 + 저장/보내기
export default function CardSheet({
  diary,
  onClose,
  onToast,
  onDelete,
}: {
  diary: Diary | null;
  onClose: () => void;
  onToast: (m: string) => void;
  onDelete?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!diary) return;
    let alive = true;
    let made: string | null = null;
    (async () => {
      const c = await renderCard(diary);
      const b = await canvasToBlob(c);
      if (!alive) return;
      made = URL.createObjectURL(b);
      setBlob(b);
      setUrl(made);
    })();
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
      setUrl(null);
      setBlob(null);
    };
  }, [diary]);

  const fileName = diary ? `그림일기-${diary.date}.png` : "그림일기.png";

  const save = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    track("card_save");
    onToast("사진첩에 저장했어요");
  };

  const share = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "오늘의 그림일기", text: "나도 오늘 참 잘했어요" });
        track("card_share", { via: "native" });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    save();
  };

  return (
    <Sheet open={!!diary} onClose={onClose} label="공유 카드">
      <h2>오늘의 그림일기</h2>
      <p>인스타 스토리·카톡에 그대로 올릴 수 있는 크기예요.</p>
      <div style={{ marginTop: 14, minHeight: 200 }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="card-preview" src={url} alt="공유할 그림일기 카드" />
        ) : (
          <p style={{ textAlign: "center", paddingTop: 60 }}>도장 찍는 중…</p>
        )}
      </div>
      <div className="btn-row">
        <button type="button" className="btn plain" onClick={save} disabled={!url}>
          사진으로 저장
        </button>
        <button type="button" className="btn" onClick={share} disabled={!url}>
          친구한테 보내기
        </button>
      </div>
      {onDelete && (
        <p className="note" style={{ textAlign: "center" }}>
          <button type="button" className="linkish" onClick={onDelete}>
            이 일기 지우기
          </button>
        </p>
      )}
    </Sheet>
  );
}
