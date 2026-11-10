"use client";

// 표지 그림 고르기 (11-10 사용자): 내가 그린 그림 하나를 그림일기장 표지에 / 처음 그림(학교 운동장)으로 되돌리기.
// 표지에서도, 나 → 기본 설정에서도 같은 시트를 연다. 이 기기에만 저장 (lib/coverPic.ts).

import { setCoverPic } from "@/lib/coverPic";
import MineSheet from "./MineSheet";

export default function CoverPicSheet({ open, onClose, current }: { open: boolean; onClose: () => void; current: string | null }) {
  return (
    <MineSheet
      open={open}
      onClose={onClose}
      title="표지 그림 바꾸기"
      desc="내가 그린 그림 하나를 그림일기장 표지에 붙여요. 이 기기에서만 바뀌어요."
      extra={
        current ? (
          <button
            type="button"
            className="btn plain"
            onClick={() => {
              setCoverPic(null);
              onClose();
            }}
          >
            처음 그림(학교 운동장)으로
          </button>
        ) : null
      }
      onPick={(d) => {
        setCoverPic(d.id);
        onClose();
      }}
    />
  );
}
