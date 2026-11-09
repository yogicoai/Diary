"use client";

// 일기 지우기 확인 (11-09 사용자: "이야기 지우기"). 무엇이 같이 사라지는지 알려 주고,
// 지우면 이 기기와 서버(게시판·우리 반 포함)에서 모두 지운다. 지우는 일은 lib/sync.ts removeDiary.

import { useState } from "react";
import { koreanDate } from "@/lib/date";
import { useMe } from "@/lib/me";
import { track, type Diary } from "@/lib/store";
import { removeDiary } from "@/lib/sync";
import Sheet from "./Sheet";

export default function DeleteSheet({
  diary,
  onClose,
  onDeleted,
  onToast,
}: {
  diary: Diary | null;
  onClose: () => void;
  onDeleted: (d: Diary) => void;
  onToast: (m: string) => void;
}) {
  const { me } = useMe();
  const [busy, setBusy] = useState(false);
  const d = diary;
  const onServer = !!me || !!d?.serverId;

  const erase = async () => {
    if (!d || busy) return;
    setBusy(true);
    try {
      const r = await removeDiary(d, !!me);
      track("diary_delete", { later: r === "later" });
      onToast(
        r === "done"
          ? "일기를 지웠어요"
          : me
            ? "지웠어요. 서버에 남은 건 인터넷이 다시 되면 마저 지워요"
            : "지웠어요. 서버에 남은 건 다음에 로그인하면 마저 지워요",
      );
      onDeleted(d);
    } catch {
      onToast("지우지 못했어요. 잠시 뒤에 다시 해 주세요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!d} onClose={onClose} label="일기 지우기">
      <h2>이 일기를 지울까요?</h2>
      {d && (
        <>
          <p className="del-what">
            {koreanDate(d.date)}
            <span>{d.title || d.body.slice(0, 14) || "그림만 그린 날"}</span>
          </p>
          <ul className="del-list">
            <li>{onServer ? "이 기기와 서버(이름표)에 보관된 일기가 모두 지워져요." : "이 기기에서 지워져요."}</li>
            {d.board && <li>교실 뒤 게시판에 붙인 그림도 같이 내려가요.</li>}
            {!!d.classIds?.length && <li>우리 반에 낸 일기와 받은 짝꿍 한마디도 사라져요.</li>}
            <li>지우면 되돌릴 수 없어요. 남겨 두고 싶으면 먼저 카드로 저장해 두세요.</li>
          </ul>
        </>
      )}
      <div className="btn-row">
        <button type="button" className="btn plain" onClick={onClose} disabled={busy}>
          그냥 둘래요
        </button>
        <button type="button" className="btn plain erase" onClick={() => void erase()} disabled={busy}>
          {busy ? "지우는 중…" : "지울래요"}
        </button>
      </div>
    </Sheet>
  );
}
