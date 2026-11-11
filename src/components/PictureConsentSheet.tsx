"use client";

// AI 그림을 처음 그려 받을 때 한 번: 국외 이전 동의 (11-11). 일기 글 → Anthropic(장면 정리) → 장면 설명만 OpenAI(그림).
// 개인정보 처리방침 초안(docs/개인정보처리방침-초안.md)의 국외 이전 항목과 같은 내용이어야 한다.

import Sheet from "./Sheet";

export default function PictureConsentSheet({ open, onAnswer, onClose }: { open: boolean; onAnswer: (yes: boolean) => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label="AI 가 그림을 그려 드릴까요">
      <h2>AI 가 그림을 그려 드릴까요?</h2>
      <p>
        오늘 쓴 일기 글(날씨·제목·본문)을 미국에 있는 Anthropic 의 Claude 가 읽고, 그릴 장면을 짧게 정리해요. 그 장면 설명만 미국에 있는
        OpenAI 로 보내서 크레파스 그림을 그려요.
      </p>
      <p style={{ marginTop: 8 }}>그린 그림은 우리 저장소에 보관되고, 그 일기를 지우거나 탈퇴하면 같이 지워져요. 이름표가 있으면 하루 한 장이에요.</p>
      <div className="btn-row">
        <button type="button" className="btn plain" onClick={() => onAnswer(false)}>
          직접 그릴게요
        </button>
        <button type="button" className="btn" onClick={() => onAnswer(true)}>
          그려 주세요
        </button>
      </div>
      <p className="note">
        보내는 곳: Anthropic, PBC · OpenAI (미국) · 보내는 것: 그날 일기 글(OpenAI 에는 장면 설명만) · 쓰는 곳: 그림 그리기 · 보내는 때: [그림
        그려 줘]를 누를 때
      </p>
    </Sheet>
  );
}
