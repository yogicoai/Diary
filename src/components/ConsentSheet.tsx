"use client";

import Sheet from "./Sheet";

// 처음 일기를 낼 때 한 번만: 선생님 한 줄을 AI(Claude)가 쓰는 데 대한 국외 이전 동의
export default function ConsentSheet({
  open,
  onAnswer,
  onClose,
}: {
  open: boolean;
  onAnswer: (yes: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="선생님이 직접 읽어 드릴까요">
      <h2>선생님이 직접 읽어 드릴까요?</h2>
      <p>
        선생님 한 줄은 AI(Anthropic의 Claude)가 오늘 일기를 읽고 써 줘요. 그래서 일기 글(날씨·제목·본문)이 미국에 있는
        Anthropic 서버로 보내져요. 그림은 보내지 않고, 우리 쪽에는 따로 저장하지 않아요.
      </p>
      <p style={{ marginTop: 8 }}>싫으시면 미리 준비된 한 줄로 도장을 찍어 드려요. 나중에 바꿀 수 있어요.</p>
      <div className="btn-row">
        <button type="button" className="btn plain" onClick={() => onAnswer(false)}>
          기본 한 줄로
        </button>
        <button type="button" className="btn" onClick={() => onAnswer(true)}>
          읽어 주세요
        </button>
      </div>
      <p className="note">
        보내는 곳: Anthropic, PBC (미국) · 보내는 것: 그날 일기 글 · 쓰는 곳: 선생님 한 줄 만들기 · 보내는 때: 일기를 낼 때마다
      </p>
    </Sheet>
  );
}
