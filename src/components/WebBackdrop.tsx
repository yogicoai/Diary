"use client";

// 넓은 화면(760px 이상) 일기장 뒤 배경. "나 → 기본 설정"에서 고른 것을 입힌다.
//   theme = 일기장 테마에 맞춤(CSS) / doodle·town·desk = 힉스필드로 만든 그림 / random = 들어올 때마다
//   mine = 내가 그린 일기 그림들을 양옆에 사진처럼 붙인 책상 (이 기기에서 그려서 입힘)

import { useEffect } from "react";
import { webBg } from "@/lib/prefs";
import { listDiaries } from "@/lib/store";
import { renderThumb } from "@/lib/thumb";

const FIXED = ["doodle", "town", "desk"];

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 내 그림 책상: 가운데(일기장 자리)를 비우고 양옆에 최근 그림을 비스듬히 붙인다 */
async function mineDesk(w: number, h: number): Promise<string | null> {
  const list = (await listDiaries()).filter((d) => d.strokes.length > 0 || d.bg).slice(0, 14);
  if (!list.length) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const desk = getComputedStyle(document.documentElement).getPropertyValue("--desk").trim() || "#e9dcc0";
  ctx.fillStyle = desk;
  ctx.fillRect(0, 0, w, h);

  const side = (w - 520) / 2; // 가운데 520px 는 일기장 자리
  if (side < 140) return null;
  const card = Math.min(240, side * 0.72);
  const rand = mulberry(list.length * 7 + 3);
  const slots: { x: number; y: number }[] = [];
  const rows = Math.max(2, Math.floor(h / (card * 0.9)));
  for (let i = 0; i < rows; i++) {
    const y = (h / rows) * (i + 0.5);
    slots.push({ x: side / 2, y }, { x: w - side / 2, y });
  }
  for (const [i, slot] of slots.entries()) {
    const d = list[i % list.length];
    const art = await renderThumb(d, Math.round(card), Math.round(card * 0.75));
    ctx.save();
    ctx.translate(slot.x + (rand() - 0.5) * side * 0.3, slot.y + (rand() - 0.5) * card * 0.25);
    ctx.rotate((rand() - 0.5) * 0.22);
    ctx.shadowColor = "rgba(40,25,10,0.28)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#fffdf6";
    const pad = 10;
    ctx.fillRect(-card / 2 - pad, -card * 0.375 - pad, card + pad * 2, card * 0.75 + pad * 2.8);
    ctx.shadowColor = "transparent";
    ctx.drawImage(art, -card / 2, -card * 0.375);
    // 마스킹 테이프
    ctx.fillStyle = "rgba(246, 201, 69, 0.75)";
    ctx.rotate(-0.08);
    ctx.fillRect(-28, -card * 0.375 - pad - 9, 56, 18);
    ctx.restore();
    if (i >= 15) break;
  }
  return c.toDataURL("image/webp", 0.85);
}

export default function WebBackdrop() {
  useEffect(() => {
    const html = document.documentElement;
    let alive = true;
    const wide = window.matchMedia("(min-width: 760px)");

    const apply = async () => {
      const pref = webBg();
      document.body.style.backgroundImage = "";
      if (pref === "random") html.dataset.webbg = FIXED[Math.floor(Math.random() * FIXED.length)];
      else if (pref === "mine" || pref === "theme") delete html.dataset.webbg;
      else html.dataset.webbg = pref;

      if (pref === "mine" && wide.matches) {
        const url = await mineDesk(Math.min(2560, window.innerWidth), Math.min(1600, window.innerHeight));
        if (!alive) return;
        if (url) {
          html.dataset.webbg = "mine";
          document.body.style.backgroundImage = `url("${url}")`;
        }
      }
    };

    void apply();
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => webBg() === "mine" && void apply(), 400);
    };
    window.addEventListener("chamjal:webbg", apply);
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.removeEventListener("chamjal:webbg", apply);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return null;
}
