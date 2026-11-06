"use client";

import { useEffect, useState } from "react";
import { THEMES, applyTheme, type ThemeId } from "@/lib/themes";

export default function ThemePicker() {
  const [cur, setCur] = useState<ThemeId>("stationery");

  useEffect(() => {
    const t = document.documentElement.dataset.theme as ThemeId | undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 html 의 테마를 읽어 온다
    if (t) setCur(t);
  }, []);

  return (
    <div className="themes" role="radiogroup" aria-label="일기장 고르기">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={cur === t.id}
          className="theme-card"
          onClick={() => {
            applyTheme(t.id);
            setCur(t.id);
          }}
        >
          <div className="theme-swatch">
            <div className="cover" style={{ background: t.swatch[0] }} />
            <div
              className="sheet"
              style={{
                backgroundColor: t.swatch[1],
                backgroundImage: `linear-gradient(${t.swatch[2]} 1px, transparent 1px), linear-gradient(90deg, ${t.swatch[2]} 1px, transparent 1px)`,
              }}
            />
          </div>
          <strong>{t.name}</strong>
          <span>{t.note}</span>
        </button>
      ))}
    </div>
  );
}
