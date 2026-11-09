"use client";

import { weatherById, weatherChoices, type WeatherId } from "@/lib/weather";

// 그날 진짜 날씨에 크레파스로 동그라미 치기
const CIRCLE = "M23 6.5c-9.5-1.2-18.6 4.6-18.8 12.6C4 27.6 13 31.4 22.6 30.5c9.3-.9 15.4-6.6 14.4-14C36.2 9.8 29.5 5.4 20 6.9";

export default function WeatherPicker({
  value,
  onChange,
  readOnly,
}: {
  value: WeatherId | null;
  onChange: (w: WeatherId) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="weather-row">
      <div className="weather" role="radiogroup" aria-label="그날 날씨">
        <span className="weather-label">날씨</span>
        {weatherChoices(value).map((w) => (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={value === w.id}
            aria-label={w.label}
            title={w.label}
            disabled={readOnly && value !== w.id}
            onClick={() => !readOnly && onChange(w.id)}
          >
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d={w.path} />
            </svg>
            {value === w.id && (
              <svg className="circle" viewBox="0 0 41 37" aria-hidden="true" preserveAspectRatio="none">
                <path d={CIRCLE} />
              </svg>
            )}
          </button>
        ))}
      </div>
      <div className="weather-word">{weatherById(value)?.label ?? ""}</div>
    </div>
  );
}
