"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "쓰기", d: "M4 20l1-4.5L15.5 5a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19 4 20Z M13.5 7l3.5 3.5" },
  { href: "/board", label: "게시판", d: "M3.5 6.5h17v13h-17z M12 3.5v3 M7 10h4v4H7z M13.5 10.5h4 M13.5 13.5h3 M7 17h10" },
  {
    href: "/class",
    label: "우리 반",
    d: "M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M3 19.5c.6-3 2.9-5 5.5-5s4.9 2 5.5 5 M15.5 11a2.5 2.5 0 1 0 0-5 M16.5 14.2c2 .4 3.6 2.3 4.2 5.3",
  },
  { href: "/diary", label: "일기장", d: "M6 3.5h11.5a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6 M6 3.5v17 M3.5 7h4M3.5 12h4M3.5 17h4 M10.5 8h5M10.5 11h4" },
  { href: "/me", label: "나", d: "M4 7.5h16v12H4z M9 3.5h6v4H9z M7 12h6 M7 15.5h4 M16 14.5a1.5 1.5 0 1 0 .01 0" },
];

export default function TabBar() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  return (
    <nav className="tabbar" aria-label="메뉴">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path === t.href || path.startsWith(`${t.href}/`);
        return (
          <Link key={t.href} href={t.href} className="tab" aria-current={on ? "page" : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={t.d} />
            </svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
