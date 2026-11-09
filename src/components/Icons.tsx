// 손으로 그린 듯한 작은 그림들. 이모지 대신 쓴다.

export function StampSvg({ className, title = "참 잘했어요" }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label={title}>
      <defs>
        <filter id="stamp-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n" />
          <feColorMatrix
            in="n"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.5"
            result="holes"
          />
          <feComposite in="SourceGraphic" in2="holes" operator="in" />
        </filter>
      </defs>
      <g filter="url(#stamp-grain)" fill="currentColor" stroke="currentColor">
        <circle cx="50" cy="50" r="45" fill="none" strokeWidth="5" />
        <circle cx="50" cy="50" r="38" fill="none" strokeWidth="1.6" />
        <text
          x="50"
          y="49"
          textAnchor="middle"
          stroke="none"
          style={{ fontFamily: "var(--font-kid), cursive", fontWeight: 700, fontSize: 30 }}
        >
          참
        </text>
        <text
          x="50"
          y="70"
          textAnchor="middle"
          stroke="none"
          style={{ fontFamily: "var(--font-kid), cursive", fontWeight: 700, fontSize: 16 }}
        >
          잘했어요
        </text>
      </g>
    </svg>
  );
}

export function BrandMark({ className }: { className?: string }) {
  // 작은 도장 + 크레파스
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="16.5" fill="none" stroke="var(--red)" strokeWidth="2.6" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="var(--red)" strokeWidth="1" />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fill="var(--red)"
        style={{ fontFamily: "var(--font-kid), cursive", fontWeight: 700, fontSize: 17 }}
      >
        참
      </text>
    </svg>
  );
}

export function NotebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3.5h11.5a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6" />
      <path d="M6 3.5v17" />
      <path d="M3.5 7h4M3.5 12h4M3.5 17h4" />
      <path d="M10.5 8h5M10.5 11h4" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20l1-4.5L15.5 5a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19 4 20Z" />
      <path d="M13.5 7l3.5 3.5" />
    </svg>
  );
}

/**
 * 종이 띠를 두른 크레파스 한 자루. wear(0~1)만큼 짧아지고 끝이 뭉툭해진다 (몽당 크레파스).
 * 바닥(y=63)에 붙어 있고, 위쪽이 닳는다.
 */
export function CrayonStick({ color, selected, wear = 0 }: { color: string; selected: boolean; wear?: number }) {
  const w = Math.min(1, Math.max(0, wear));
  const len = 48 - w * 32; // 몸통 48 → 16
  const top = 63 - len;
  const tipH = 12 - w * 7; // 뾰족함이 줄어든다
  const flat = w * 4.5; // 끝이 평평해진다
  const label = len > 24; // 많이 닳으면 종이 띠가 벗겨져 없다
  const lt = top + len * 0.22;
  const lh = len * 0.5;
  return (
    <svg viewBox="0 0 30 64" aria-hidden="true">
      <path
        d={`M8 ${top + 1} L${15 - flat} ${top - tipH} Q15 ${top - tipH - 1.2} ${15 + flat} ${top - tipH} L22 ${top + 1} Z`}
        fill={color}
        stroke="rgba(0,0,0,.25)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <rect x="7" y={top} width="16" height={len} rx="2" fill={color} stroke="rgba(0,0,0,.25)" strokeWidth="0.8" />
      {label && (
        <>
          <rect x="7" y={lt} width="16" height={lh} fill="rgba(255,255,255,.82)" />
          <path d={`M7 ${lt + 2}h16M7 ${lt + lh - 2}h16`} stroke={color} strokeWidth="1.4" />
          <path d={`M10 ${lt + lh * 0.35}h10M10 ${lt + lh * 0.55}h7`} stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity=".7" />
        </>
      )}
      {!label && <path d={`M9 ${top + len * 0.5} l3 -2 l3 2 l3 -2 l3 2`} stroke="rgba(255,255,255,.7)" strokeWidth="1" fill="none" />}
      {selected && <circle cx="15" cy="58" r="2" fill="#fff" />}
    </svg>
  );
}
