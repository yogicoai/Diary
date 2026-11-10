// 예제 데이터 (11-10 사용자: "개발자 계정에서 일기장·우리 반·게시판 등을 예제로 확인하고 보완할 수 있게", "클라이언트에게 이렇게 된다고 보여 줄 수 있게")
//
//   node --env-file=.env.local scripts/demo.mjs build    예제 만들기 (있던 예제는 지우고 오늘 기준으로 새로)
//   node --env-file=.env.local scripts/demo.mjs remove   예제 모두 지우기 — 출시 전에 꼭!
//   임시 DB 로: --uri <dev:mem 이 찍은 주소>   다른 서버: --base http://localhost:6900
//
// build 는 6900 에 같은 DB 를 쓰는 서버가 켜져 있어야 한다 (게시판 붙이기를 화면에서 진짜로 해서 카드 그림을 만든다.
//   붙일 때마다 AI 게시판 검사 한 번 ≈ 0.4원, 모두 12번. 진짜 DB(npm run dev)면 그림은 카페24 FTP 에 올라간다)
//
// 만드는 것
//   · fe(개발자 계정): 이름표 '길동'(1988년생), 생일 = 만든 날(오늘부터 3학년 8반). 원래 이름표는 demoBackup 에 두었다가 remove 때 되돌린다
//     어제까지 30일 하루도 안 빠진 일기 + 밀린 숙제 1편(날씨·배경·크레파스 그림·선생님 답장·칭찬 스티커·도장 여러 가지, 비밀 일기 하나),
//     지난 10일 숙제 검사(칭찬 스티커판 한 판), 일주일·한 달 개근상·숙제 상, 게시판 2편. 오늘 일기·숙제는 비워 둔다 → 보여 줄 때 직접 써 보기(생일 축하 답장·생일 축하장)
//   · 예제 친구 8명 (개발용 로그인 데모지민·데모도윤·데모서연·데모하준·데모유나 + fe 와 동갑 데모민준·데모수빈·데모예린)
//     교실 뒤 게시판 10편(도장·스티커, 지난주 것은 '지난주 참 잘한 일기' 후보, 동갑 친구 탭), 오늘의 숙제 벽 3장
//   · 우리 반 '퇴근 후 그림반': 반장 fe + 친구 6명, 오늘 반 숙제, 오늘 낸 친구 셋(출석부), 반에 낸 일기·도장·짝꿍 한마디, 이번 달 칭찬 스티커 자랑 셋
//
// 표시: 예제 사용자·반·숙제·상장은 demo: true, 일기는 clientId 가 demo- 로 시작한다.
// 브라우저 일기장(IndexedDB)은 기기에 남으니, 보여 줄 땐 시크릿 창에서 교무실 문(/admin)으로 fe 로 들어가 / 로 가면 깔끔하다.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { MongoClient } from "mongodb";
import puppeteer from "puppeteer-core";
import { Client as FtpClient } from "basic-ftp";

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const URI = opt("--uri") ?? process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "chamjal";
const BASE = opt("--base") ?? "http://localhost:6900";
if (!URI || !["build", "remove"].includes(cmd)) {
  console.log("쓰는 법: node --env-file=.env.local scripts/demo.mjs build|remove [--uri <Mongo 주소>] [--base http://localhost:6900]");
  process.exit(1);
}

const mongo = await MongoClient.connect(URI, { serverSelectionTimeoutMS: 10000 });
const db = mongo.db(DB_NAME);
const col = (n) => db.collection(n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 날짜 (한국 시간) ---------- */
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayKey = (off) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - off * 86400e3).toISOString().slice(0, 10);
const at = (off, hour = 21, min = 0) => new Date(Date.parse(`${dayKey(off)}T00:00:00Z`) + ((hour - 9) * 60 + min) * 60e3);

/* ---------- 크레파스 그림 (0~1 좌표, 그림칸은 4:3) ---------- */
let seed = 20261110;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const C = { black: "#2b2622", red: "#e0453a", orange: "#f28a2e", yellow: "#f6c945", green: "#4fa35b", sky: "#5aa9e6", blue: "#2f5fb3", pink: "#f08fb0", brown: "#8a5a3b", skin: "#f6c7a1" };
const S = [0.012, 0.022, 0.04];
const jit = (v) => +(v + (rnd() - 0.5) * 0.004).toFixed(4);
const stroke = (color, size, pts) => ({ color: C[color], size: S[size], points: pts.map(([x, y]) => ({ x: jit(x), y: jit(y) })) });
const line = (color, size, ...pts) => stroke(color, size, pts);
const ellipse = (cx, cy, rx, ry, color, size = 1, from = 0, to = 2 * Math.PI, n = 24) =>
  stroke(color, size, Array.from({ length: n + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / n;
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
  }));
const circle = (cx, cy, r, color, size = 1) => ellipse(cx, cy, r, r * 1.333, color, size);
/** 크레파스로 칠하기: 상자 안을 지그재그로 */
const hatch = (x0, y0, x1, y1, color, size = 2) => {
  const pts = [];
  const step = S[size] * 0.9;
  for (let x = x0, up = true; x <= x1; x += step, up = !up) pts.push([x, up ? y0 : y1]);
  return stroke(color, size, pts);
};
function person(x, y, s = 1, shirt = "blue") {
  const r = 0.045 * s;
  const hy = y - 0.36 * s;
  return [
    circle(x, hy, r * 0.6, "skin", 2),
    circle(x, hy, r, "black", 0),
    line("black", 0, [x - r * 0.4, hy - r * 0.2], [x - r * 0.4, hy - r * 0.05]),
    line("black", 0, [x + r * 0.4, hy - r * 0.2], [x + r * 0.4, hy - r * 0.05]),
    ellipse(x, hy + r * 0.35, r * 0.45, r * 0.35, "red", 0, 0.2, Math.PI - 0.2, 8),
    line(shirt, 2, [x, hy + r * 1.35], [x, y - 0.14 * s]),
    line(shirt, 1, [x - 0.07 * s, y - 0.26 * s], [x, y - 0.22 * s], [x + 0.07 * s, y - 0.26 * s]),
    line("black", 1, [x - 0.045 * s, y], [x, y - 0.14 * s], [x + 0.045 * s, y]),
  ];
}
const sun = (cx, cy, r) => [
  circle(cx, cy, r * 0.6, "yellow", 2),
  circle(cx, cy, r, "orange", 1),
  ...Array.from({ length: 8 }, (_, i) => {
    const t = (i / 8) * 2 * Math.PI;
    return line("orange", 1, [cx + r * 1.3 * Math.cos(t), cy + r * 1.73 * Math.sin(t)], [cx + r * 1.8 * Math.cos(t), cy + r * 2.4 * Math.sin(t)]);
  }),
];
const heart = (cx, cy, s, color = "pink") =>
  stroke(color, 1, Array.from({ length: 25 }, (_, i) => {
    const t = (i / 24) * 2 * Math.PI;
    return [cx + (s * 16 * Math.sin(t) ** 3) / 16, cy - (s * 1.333 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))) / 16];
  }));
const star = (cx, cy, r, color = "yellow") =>
  stroke(color, 1, Array.from({ length: 11 }, (_, i) => {
    const rr = i % 2 ? r * 0.45 : r;
    const t = -Math.PI / 2 + (i * Math.PI) / 5;
    return [cx + rr * Math.cos(t), cy + rr * 1.333 * Math.sin(t)];
  }));
const fish = (cx, cy) => [
  ellipse(cx, cy, 0.07, 0.05, "orange", 2),
  ellipse(cx, cy, 0.09, 0.07, "brown", 1),
  line("brown", 1, [cx + 0.09, cy], [cx + 0.14, cy - 0.05], [cx + 0.14, cy + 0.05], [cx + 0.09, cy]),
  circle(cx - 0.05, cy - 0.015, 0.006, "black", 1),
];
const umbrella = (cx, cy, r, color = "yellow") => [
  ellipse(cx, cy, r, r * 0.9, color, 2, Math.PI, 2 * Math.PI, 16),
  hatch(cx - r * 0.7, cy - r * 0.7, cx + r * 0.7, cy - 0.01, color, 2),
  line("black", 1, [cx, cy], [cx, cy + r * 1.2], [cx + 0.02, cy + r * 1.3], [cx + 0.035, cy + r * 1.2]),
];
const rain = (x0, x1, y0, y1, n = 10) =>
  Array.from({ length: n }, () => {
    const x = x0 + rnd() * (x1 - x0);
    const y = y0 + rnd() * (y1 - y0);
    return line("sky", 0, [x, y], [x - 0.015, y + 0.06]);
  });
const snow = (x0, x1, y0, y1, n = 12) =>
  Array.from({ length: n }, () => {
    const x = x0 + rnd() * (x1 - x0);
    const y = y0 + rnd() * (y1 - y0);
    return [line("sky", 0, [x - 0.01, y], [x + 0.01, y]), line("sky", 0, [x, y - 0.013], [x, y + 0.013])];
  }).flat();
const moon = (cx, cy, r) => [ellipse(cx, cy, r, r * 1.333, "yellow", 2, Math.PI * 0.5, Math.PI * 1.5, 14), ellipse(cx + r * 0.35, cy, r * 0.75, r, "yellow", 1, Math.PI * 0.55, Math.PI * 1.45, 12)];
const zzz = (x, y) => [0, 1, 2].map((i) => line("blue", 0, [x + i * 0.04, y - i * 0.05], [x + i * 0.04 + 0.025, y - i * 0.05], [x + i * 0.04, y - i * 0.05 + 0.03], [x + i * 0.04 + 0.025, y - i * 0.05 + 0.03]));
const cat = (cx, cy) => [
  ellipse(cx, cy + 0.12, 0.08, 0.09, "orange", 2),
  circle(cx, cy, 0.05, "orange", 2),
  circle(cx, cy, 0.06, "brown", 0),
  line("brown", 1, [cx - 0.05, cy - 0.05], [cx - 0.035, cy - 0.12], [cx - 0.01, cy - 0.07]),
  line("brown", 1, [cx + 0.05, cy - 0.05], [cx + 0.035, cy - 0.12], [cx + 0.01, cy - 0.07]),
  circle(cx - 0.02, cy - 0.01, 0.005, "black", 1),
  circle(cx + 0.02, cy - 0.01, 0.005, "black", 1),
  line("black", 0, [cx - 0.09, cy + 0.02], [cx - 0.03, cy + 0.025]),
  line("black", 0, [cx + 0.09, cy + 0.02], [cx + 0.03, cy + 0.025]),
];
const phone = (x, y) => [hatch(x, y, x + 0.04, y + 0.1, "black", 1), line("black", 1, [x, y], [x + 0.045, y], [x + 0.045, y + 0.1], [x, y + 0.1], [x, y])];
const tent = (cx, cy) => [hatch(cx - 0.09, cy - 0.12, cx + 0.09, cy, "orange", 2), line("brown", 1, [cx - 0.12, cy], [cx, cy - 0.18], [cx + 0.12, cy], [cx - 0.12, cy]), line("brown", 1, [cx, cy - 0.18], [cx, cy])];
const book = (cx, cy) => [hatch(cx - 0.08, cy - 0.06, cx + 0.08, cy + 0.04, "sky", 1), line("blue", 1, [cx - 0.08, cy - 0.06], [cx + 0.08, cy - 0.06], [cx + 0.08, cy + 0.05], [cx - 0.08, cy + 0.05], [cx - 0.08, cy - 0.06]), line("blue", 1, [cx, cy - 0.06], [cx, cy + 0.05])];
const cakeSlice = (cx, cy) => [hatch(cx - 0.06, cy - 0.04, cx + 0.06, cy + 0.04, "pink", 1), line("brown", 1, [cx - 0.07, cy + 0.05], [cx + 0.07, cy + 0.05], [cx + 0.07, cy - 0.05], [cx - 0.07, cy - 0.05], [cx - 0.07, cy + 0.05]), circle(cx, cy - 0.07, 0.015, "red", 2)];
const gacha = (cx, cy) => [circle(cx, cy - 0.08, 0.06, "sky", 1), circle(cx - 0.02, cy - 0.09, 0.012, "red", 2), circle(cx + 0.02, cy - 0.07, 0.012, "yellow", 2), hatch(cx - 0.06, cy, cx + 0.06, cy + 0.1, "red", 2)];
const bowl = (cx, cy, color = "orange") => [ellipse(cx, cy, 0.08, 0.06, color, 2, 0, Math.PI, 12), line("black", 1, [cx - 0.09, cy], [cx + 0.09, cy]), ...[-0.03, 0, 0.03].map((d) => line("black", 0, [cx + d, cy - 0.03], [cx + d + 0.01, cy - 0.07], [cx + d, cy - 0.11]))];
const flower = (cx, cy, color = "pink") => [circle(cx, cy, 0.012, "yellow", 2), ...[0, 1, 2, 3, 4].map((i) => circle(cx + 0.025 * Math.cos((i * 2 * Math.PI) / 5), cy + 0.033 * Math.sin((i * 2 * Math.PI) / 5), 0.012, color, 2)), line("green", 1, [cx, cy + 0.04], [cx, cy + 0.14])];

/* ---------- 예제 글 ---------- */
// fe (개발자 계정 = 예제의 '나'): 어제(1)부터 12일 전까지 하루도 안 빠짐 + 밀린 숙제 한 편
const FE_DIARIES = [
  { off: 12, weather: "sun", bg: "alley", title: "붕어빵 원정대", body: "퇴근길에 붕어빵 트럭을 만났다. 팥 두 개, 슈크림 하나를 샀는데 집에 오는 길에 한 마리가 사라졌다.", teacher: "붕어빵 실종 사건, 범인은 입가에 묻은 팥이 말해 주네요.", stickers: ["yum", "laugh"], stamp: "cham", draw: () => [...person(0.3, 0.93, 1, "green"), ...fish(0.58, 0.7)] },
  { off: 11, weather: "cloud", bg: "office", title: "월요일 생존", body: "알람을 세 번 끄고 일어났다. 그래도 지각은 안 했다. 점심은 제육볶음이었다.", teacher: "알람 세 번에도 출근 성공, 월요일 챔피언이에요.", stickers: ["brave", "thanks"], stamp: "brave", draw: () => [...person(0.62, 0.95, 1.05, "blue"), line("sky", 1, [0.7, 0.45], [0.72, 0.5]), line("sky", 1, [0.54, 0.44], [0.52, 0.49])] },
  { off: 10, weather: "rain", bg: "rainy-window", title: "또 우산", body: "우산을 두고 와서 편의점에서 또 샀다. 우리 집 우산이 열 개가 넘는다.", teacher: "우산 컬렉션이 곧 박물관 되겠어요. 오늘도 무사 귀가!", stickers: ["laugh", "cozy"], stamp: "thanks", draw: () => [...umbrella(0.5, 0.52, 0.12, "yellow"), ...person(0.5, 0.95, 0.9, "red"), ...rain(0.15, 0.85, 0.08, 0.4)] },
  { off: 9, weather: "partly", bg: "home-table", title: "엄마랑 통화", body: "용건 없이 엄마한테 전화했다. 밥은 먹었냐는 말을 다섯 번 들었다.", teacher: "밥 질문 다섯 번이면 사랑 고백 다섯 번이에요.", stickers: ["sweet", "great"], stamp: "cool", draw: () => [...person(0.25, 0.9, 0.9, "pink"), ...phone(0.31, 0.48), heart(0.45, 0.3, 0.035), heart(0.55, 0.22, 0.025), heart(0.63, 0.3, 0.03)] },
  { off: 8, weather: "sun", bg: "park", title: "공원 고양이", body: "공원 벤치에 치즈 고양이가 앉아 있었다. 사진 찍으려니까 고개를 홱 돌렸다.", teacher: "모델료를 안 줘서 그래요. 다음엔 간식을 챙겨 가요!", stickers: ["laugh", "envy"], stamp: "envy", draw: () => [...cat(0.62, 0.62), ...person(0.3, 0.93, 0.95, "sky"), ...sun(0.85, 0.15, 0.04)] },
  { off: 7, weather: "storm", bg: "office", title: "야근", body: "회의가 길어져서 늦게 퇴근했다. 버스에서 졸다가 한 정거장을 지나쳤다.", teacher: "오늘 정말 수고 많았어요. 따뜻한 물 한 잔 하고 푹 자요.", stickers: ["rest", "cheer"], stamp: "cheer", draw: () => [...moon(0.18, 0.18, 0.06), ...person(0.6, 0.95, 1, "black"), ...zzz(0.68, 0.42)] },
  { off: 6, weather: "sun", bg: "camping", title: "주말 캠핑", body: "친구들이랑 캠핑을 갔다. 고기는 좀 탔지만 별은 엄청 많았다.", teacher: "탄 고기는 별 구경 입장료였던 걸로 해요.", stickers: ["envy", "dream"], stamp: "best", draw: () => [star(0.2, 0.15, 0.03), star(0.45, 0.1, 0.025), star(0.7, 0.18, 0.03), ...tent(0.3, 0.85), ...person(0.62, 0.93, 0.85, "green"), ...person(0.78, 0.93, 0.8, "orange")] },
  { off: 5, weather: "sun", bg: "stationery-shop", title: "문방구 앞에서", body: "회사 앞에 아직 문방구가 있었다. 뽑기를 한 번 했는데 꽝이었다. 그래도 설렜다.", teacher: "꽝도 추억 한 칸이에요. 다음 판은 선생님이 응원할게요.", stickers: ["dream", "laugh"], stamp: "cham", cls: true, draw: () => [...person(0.4, 0.95, 1, "red"), ...gacha(0.62, 0.72)] },
  { off: 4, weather: "cloud", bg: "library", title: "책 한 권", body: "도서관에서 책을 빌렸다. 열 쪽 읽고 잠들었다. 그래도 한 장은 넘겼다.", teacher: "열 쪽이면 어른이 기준 완독이에요. 꿀잠도 숙제 인정!", stickers: ["proud", "rest"], stamp: "thanks", cls: true, draw: () => [...person(0.42, 0.95, 1, "blue"), ...book(0.6, 0.62), ...zzz(0.5, 0.42)] },
  { off: 3, weather: "partly", bg: "cafe", title: "새로 생긴 카페", body: "동네에 새 카페가 생겼다. 케이크가 너무 예뻐서 사진만 열 장 찍었다.", teacher: "사진 찍는 동안 케이크가 기다려 줬네요. 착한 케이크!", stickers: ["yum", "cool"], stamp: "great", draw: () => [...cakeSlice(0.42, 0.78), ...person(0.7, 0.95, 0.95, "pink")] },
  { off: 2, weather: "sun", bg: "bedroom", secret: true, title: "아무도 모르는 일", body: "다음 달에 회사를 옮긴다. 아직 아무한테도 말 안 했다. 떨리고 설렌다.", teacher: "새 출발 응원해요. 이 비밀은 선생님이 꼭 지킬게요.", stickers: ["cool", "cheer"], stamp: "brave", draw: () => [heart(0.5, 0.45, 0.09, "red"), ...person(0.3, 0.95, 0.9, "sky")] },
  { off: 1, weather: "snow", bg: "snow-day", title: "첫눈", body: "올해 첫눈이 왔다. 출근길이 미끄러웠지만 하루 종일 기분이 좋았다.", teacher: "첫눈에 안 미끄러진 발목에게도 상장을 줘요.", stickers: ["proud", "cozy"], stamp: "great", cls: true, draw: () => [...person(0.5, 0.95, 1, "red"), ...snow(0.1, 0.9, 0.05, 0.55, 14)] },
  // 13~30일 전 (11-10 사용자: "일기장이나 나 부분도 채워 놔") → 30일 연속 = 한 달 개근상, 달력이 꽉 찬다
  { off: 13, weather: "rain", bg: "rainy-street", title: "비 오는 출근길", body: "버스를 놓쳐서 비를 맞으며 뛰었다. 머리가 미역이 됐다.", teacher: "미역 머리로 출근하다니, 오늘의 용감상은 정해졌네요.", stickers: ["brave", "laugh"], stamp: "brave", draw: () => [...person(0.5, 0.95, 1, "blue"), ...rain(0.1, 0.9, 0.05, 0.5, 14)] },
  { off: 14, weather: "sun", bg: "beach", title: "바다 보고 싶은 날", body: "점심시간에 바다 사진을 찾아봤다. 파도 소리를 틀어 놓고 일했다.", teacher: "책상 위 바다 여행, 비행기 값 아꼈네요.", stickers: ["dream", "envy"], stamp: "envy", draw: () => [...sun(0.82, 0.15, 0.04), ...person(0.35, 0.93, 0.95, "sky")] },
  { off: 15, weather: "cloud", bg: "snack-bar", title: "떡볶이 회식", body: "팀 회식으로 떡볶이를 먹었다. 순대를 누가 다 먹었는지 아무도 모른다.", teacher: "순대 실종 사건, 범인은 아마 모두였을 거예요.", stickers: ["yum", "laugh"], stamp: "cham", draw: () => [...bowl(0.5, 0.75, "red"), ...person(0.2, 0.95, 0.85, "green"), ...person(0.8, 0.95, 0.85, "orange")] },
  { off: 16, weather: "partly", bg: "living-room", title: "대청소", body: "주말에 대청소를 했다. 소파 밑에서 작년 귤이 나왔다.", teacher: "작년 귤 발굴 성공! 고고학자 상을 드려요.", stickers: ["thanks", "laugh"], stamp: "thanks", draw: () => [...person(0.35, 0.95, 1, "pink"), circle(0.65, 0.85, 0.03, "orange", 2)] },
  { off: 17, weather: "sun", bg: "autumn-leaves", title: "은행나무", body: "회사 앞 은행나무가 노랗게 물들었다. 냄새는 모른 척했다.", teacher: "냄새는 비밀로 하고 노란 것만 기억해요.", stickers: ["envy", "cozy"], stamp: "envy", draw: () => [...person(0.5, 0.95, 1, "orange"), circle(0.3, 0.3, 0.015, "yellow", 2), circle(0.7, 0.25, 0.015, "yellow", 2), circle(0.6, 0.45, 0.015, "yellow", 2)] },
  { off: 18, weather: "cloud", bg: "movie-night", title: "이불 속 영화", body: "금요일 밤에 이불 속에서 영화를 봤다. 반쯤 보다 잠들었다.", teacher: "영화가 자장가였네요. 결말은 꿈에서 봐요.", stickers: ["rest", "cozy"], stamp: "thanks", draw: () => [...person(0.6, 0.95, 0.9, "blue"), ...zzz(0.66, 0.42)] },
  { off: 19, weather: "sun", bg: "grandma-house", title: "할머니 댁", body: "할머니 댁에 갔다. 밥을 세 그릇 먹고도 더 먹으라는 말을 들었다.", teacher: "할머니 밥 세 그릇이면 효도 완료예요.", stickers: ["yum", "sweet"], stamp: "great", draw: () => [...bowl(0.6, 0.78, "brown"), ...person(0.3, 0.95, 1, "green")] },
  { off: 20, weather: "partly", bg: "cafe", title: "카공 실패", body: "카페에서 공부하려고 했는데 케이크만 먹고 왔다.", teacher: "케이크도 공부예요. 단맛 연구 수고했어요.", stickers: ["yum", "laugh"], stamp: "cham", draw: () => [...cakeSlice(0.6, 0.78), ...person(0.3, 0.95, 0.95, "sky")] },
  { off: 21, weather: "cloud", bg: "office", title: "새 프로젝트", body: "새 프로젝트를 맡았다. 회의실 화이트보드가 꽉 찼다.", teacher: "화이트보드를 다 채운 어른이, 칭찬 스티커 두 장!", stickers: ["great", "cool"], stamp: "best", draw: () => [...person(0.62, 0.95, 1, "black"), ...book(0.3, 0.7)] },
  { off: 22, weather: "rain", bg: "rainy-window", title: "비 오는 주말", body: "비가 와서 하루 종일 집에 있었다. 라면 물 조절에 실패했다.", teacher: "국물 라면도 괜찮아요. 비 오는 날엔 그게 정답!", stickers: ["cozy", "laugh"], stamp: "cheer", draw: () => [...bowl(0.5, 0.78, "orange"), ...rain(0.1, 0.9, 0.05, 0.45)] },
  { off: 23, weather: "sun", bg: "park", title: "자전거", body: "강변에서 자전거를 탔다. 엉덩이가 아직도 아프다.", teacher: "엉덩이도 같이 운동했네요. 운동 두 배 인정!", stickers: ["brave", "laugh"], stamp: "cool", draw: () => [...sun(0.15, 0.15, 0.04), ...person(0.55, 0.95, 1, "red")] },
  { off: 24, weather: "partly", bg: "library", title: "자격증 공부", body: "자격증 문제집을 샀다. 첫 장에 이름만 쓰고 덮었다.", teacher: "이름 쓰기가 제일 어려운 단계예요. 이미 시작했네요!", stickers: ["proud", "cheer"], stamp: "cheer", draw: () => [...book(0.6, 0.7), ...person(0.3, 0.95, 0.95, "blue")] },
  { off: 25, weather: "sun", bg: "home-table", title: "엄마표 반찬", body: "엄마가 반찬을 택배로 보내 줬다. 냉장고가 꽉 찼다.", teacher: "냉장고에 사랑이 꽉 찼네요. 아껴 먹어요.", stickers: ["sweet", "yum"], stamp: "great", draw: () => [...bowl(0.5, 0.75, "green"), heart(0.75, 0.3, 0.04), heart(0.25, 0.3, 0.03)] },
  { off: 26, weather: "cloud", bg: "train-window", title: "출장 가는 기차", body: "출장 가는 기차에서 창밖만 봤다. 노트북은 한 번도 안 열었다.", teacher: "창밖 구경도 일이에요. 영감 충전 완료!", stickers: ["dream", "envy"], stamp: "envy", draw: () => [...person(0.55, 0.95, 0.9, "green")] },
  { off: 27, weather: "sun", bg: "amusement-park", title: "놀이공원", body: "회사 동기들이랑 놀이공원에 갔다. 바이킹에서 목소리를 다 썼다.", teacher: "목소리는 두고 왔어도 추억은 챙겨 왔네요.", stickers: ["laugh", "bravo"], stamp: "best", draw: () => [...person(0.4, 0.95, 0.9, "pink"), ...person(0.6, 0.95, 0.9, "blue"), star(0.5, 0.2, 0.04)] },
  { off: 28, weather: "partly", bg: "sunny-balcony", title: "화분 물 주기", body: "베란다 화분에 물을 줬다. 새 잎이 하나 났다.", teacher: "새 잎이 '참 잘했어요' 하고 인사했네요.", stickers: ["proud", "cozy"], stamp: "thanks", draw: () => [...flower(0.65, 0.72, "red"), ...person(0.35, 0.95, 0.95, "green")] },
  { off: 29, weather: "cloud", bg: "alley", title: "동네 산책", body: "저녁 먹고 동네를 한 바퀴 돌았다. 처음 보는 빵집을 발견했다.", teacher: "빵집 발견은 동네 탐험대 1등이에요.", stickers: ["dream", "yum"], stamp: "cool", draw: () => [...person(0.5, 0.95, 1, "orange")] },
  { off: 30, weather: "sun", bg: "picnic", title: "가을 소풍", body: "회사 워크숍으로 소풍을 갔다. 김밥 꼬다리를 다 내가 먹었다.", teacher: "김밥 꼬다리는 원래 제일 맛있는 부분이죠. 승리!", stickers: ["yum", "bravo"], stamp: "best", draw: () => [...person(0.35, 0.95, 1, "red"), ...flower(0.7, 0.8, "yellow")] },
  { off: 33, late: true, createdOff: 1, weather: "cloud", bg: "living-room", title: "밀린 일기", body: "이날 일기를 깜빡했다. 사실 하루 종일 소파와 한 몸이었다.", teacher: "밀린 숙제 발견! 소파와 한 몸이었던 것도 기록이죠.", stickers: ["rest", "laugh"], stamp: "cham", draw: () => [...person(0.55, 0.93, 0.9, "orange"), ...zzz(0.62, 0.4)] },
];
// fe 일기 중 게시판에 붙일 것 (fe 는 비밀번호로만 들어와서, 같은 일기를 가진 임시 예제 친구로 붙인 뒤 게시판 상태를 fe 일기로 옮긴다)
const FE_BOARD = [
  { off: 8, board: "drawing", likes: 7 },
  { off: 6, board: "full", likes: 3 },
];

const FRIENDS = [
  { key: "jimin", login: "데모지민", nickname: "지민", birth: "1991-04-12", kid: "girl", cls: true, shirt: "pink" },
  { key: "doyun", login: "데모도윤", nickname: "도윤", birth: "1987-08-30", kid: "boy", cls: true, shirt: "blue" },
  { key: "seoyeon", login: "데모서연", nickname: "서연", birth: "1994-01-21", kid: "girl", cls: true, shirt: "green" },
  { key: "hajun", login: "데모하준", nickname: "하준", birth: "1985-06-02", kid: "boy", cls: true, shirt: "orange" },
  { key: "yuna", login: "데모유나", nickname: "유나", birth: "1998-12-24", kid: "girl", cls: false, shirt: "sky" },
  // fe(길동)와 동갑(1988년생) → 게시판 '동갑 친구' 탭 (11-10 사용자: "동갑 친구도 채워")
  { key: "minjun", login: "데모민준", nickname: "민준", birth: "1988-02-17", kid: "boy", cls: true, shirt: "red" },
  { key: "subin", login: "데모수빈", nickname: "수빈", birth: "1988-07-03", kid: "girl", cls: true, shirt: "yellow" },
  { key: "yerin", login: "데모예린", nickname: "예린", birth: "1988-10-29", kid: "girl", cls: false, shirt: "pink" },
];

// board: "full"(글까지) / "drawing"(그림만), cls: 우리 반에 냄. likes: 게시판에서 받을 도장·스티커 수(지난주 1~3등 순서)
const FRIEND_DIARIES = [
  { who: "jimin", off: 2, board: "full", likes: 5, weather: "sun", bg: "sunny-balcony", title: "요가 첫날", body: "유튜브 보고 요가를 따라 했다. 고양이 자세를 하는데 진짜 고양이가 와서 구경했다.", teacher: "진짜 고양이가 자세 검사하러 왔네요. 합격이래요!", stickers: ["laugh", "proud"], stamp: "cool", draw: (s) => [...person(0.45, 0.95, 1, s), ...cat(0.72, 0.7)] },
  { who: "jimin", off: 0, cls: true, weather: "partly", bg: "snack-bar", title: "점심 김치찌개", body: "회사 앞 김치찌개 집에서 계란말이를 서비스로 받았다. 오늘 제일 맛있던 것!", teacher: "서비스 계란말이는 착하게 산 어른이에게 오는 상이에요.", stickers: ["yum", "bravo"], stamp: "best", draw: (s) => [...bowl(0.55, 0.75, "red"), ...person(0.25, 0.95, 0.9, s)] },
  { who: "doyun", off: 3, board: "drawing", likes: 4, weather: "sun", bg: "playground-swing", title: "조카랑 놀이터", body: "조카랑 놀이터에 갔다. 미끄럼틀을 타다가 엉덩이가 꼈다. 조카가 사진을 찍었다.", teacher: "엉덩이 구조 작전 성공! 그 사진은 가족 단톡방 각이에요.", stickers: ["laugh", "sweet"], stamp: "cham", draw: (s) => [...person(0.4, 0.95, 1, s), ...person(0.58, 0.95, 0.6, "yellow")] },
  { who: "doyun", off: 0, cls: true, weather: "partly", bg: "alley", title: "퇴근길 노을", body: "퇴근길 하늘이 분홍색이었다. 버스 창문으로 한참 봤다.", teacher: "분홍 하늘 구경값으로 오늘 피곤함은 반값이에요.", stickers: ["dream", "cozy"], stamp: "thanks", draw: (s) => [...person(0.5, 0.95, 1, s), ...sun(0.8, 0.3, 0.05)] },
  { who: "seoyeon", off: 1, board: "full", likes: 3, weather: "cloud", bg: "office", title: "새 회사 첫날", body: "새 회사 첫 출근. 이름 외우느라 머리가 터질 뻔했다. 내 자리 옆 화분이 귀엽다.", teacher: "이름은 내일 외워도 돼요. 화분이랑 먼저 친해진 것 축하해요.", stickers: ["brave", "cool"], stamp: "brave", draw: (s) => [...person(0.6, 0.95, 1, s), ...flower(0.3, 0.7, "pink")] },
  { who: "seoyeon", off: 2, cls: true, weather: "rain", bg: "rainy-street", title: "빗소리 라면", body: "비 오는 소리 들으면서 라면을 먹었다. 계란을 두 개 넣었다.", teacher: "계란 두 개면 라면계의 우등상이에요.", stickers: ["yum", "cozy"], stamp: "great", draw: (s) => [...bowl(0.5, 0.75, "orange"), ...rain(0.1, 0.9, 0.05, 0.4), ...person(0.22, 0.95, 0.8, s)] },
  { who: "hajun", off: 4, board: "full", likes: 6, weather: "sun", bg: "sports-day", title: "아들 운동회", body: "아들 운동회에 갔다. 학부모 달리기에서 2등을 했다. 다음 날 다리가 안 움직였다.", teacher: "2등 메달은 다리 근육통이 대신 받았네요. 멋진 아빠예요!", stickers: ["bravo", "brave"], stamp: "best", draw: (s) => [...person(0.4, 0.95, 1.05, s), ...person(0.62, 0.95, 0.6, "green"), star(0.8, 0.2, 0.04)] },
  { who: "hajun", off: 3, cls: true, weather: "cloud", bg: "home-table", title: "아내 생일상", body: "아내 생일이라 미역국을 끓였다. 간을 세 번 봤는데 세 번 다 싱거웠다.", teacher: "싱거운 미역국도 마음은 짭짤하게 전해졌을 거예요.", stickers: ["sweet", "great"], stamp: "cool", draw: (s) => [...bowl(0.55, 0.72, "green"), ...person(0.25, 0.95, 0.9, s), heart(0.75, 0.3, 0.04)] },
  { who: "yuna", off: 1, board: "drawing", likes: 2, weather: "partly", bg: "store-parasol", title: "편의점 신상", body: "편의점 신상 디저트를 다 사 먹어 봤다. 1등은 크림빵.", teacher: "신상 심사위원 수고했어요. 크림빵에게 금메달을!", stickers: ["yum", "hundred"], stamp: "best", draw: (s) => [...person(0.3, 0.95, 0.95, s), ...cakeSlice(0.62, 0.8)] },
  { who: "yuna", off: 6, board: "full", likes: 8, weather: "sun", bg: "flower-field", title: "합격 발표", body: "기다리던 자격증 합격 문자가 왔다. 엄마한테 제일 먼저 전화했다.", teacher: "합격 축하해요! 엄마가 제일 먼저 알게 된 것도 참 예뻐요.", stickers: ["bravo", "best"], stamp: "best", draw: (s) => [...person(0.5, 0.95, 1, s), ...phone(0.56, 0.5), ...flower(0.2, 0.75), ...flower(0.8, 0.78, "red")] },
  // 동갑 친구(1988년생)
  { who: "minjun", off: 2, board: "full", likes: 4, weather: "sun", bg: "park", title: "첫 마라톤", body: "10킬로 마라톤에 나갔다. 걷다 뛰다 했지만 완주 메달을 받았다.", teacher: "걷다 뛰다도 완주예요. 메달이 제일 잘 어울려요!", stickers: ["bravo", "brave"], stamp: "best", draw: (s) => [...person(0.5, 0.95, 1, s), star(0.75, 0.25, 0.04), star(0.25, 0.3, 0.03)] },
  { who: "minjun", off: 0, cls: true, likes: 3, weather: "partly", bg: "snack-bar", title: "점심 돈가스", body: "회사 근처 돈가스 집에 줄을 서서 먹었다. 오늘 제일 맛있던 것!", teacher: "줄 선 보람이 바삭하게 났네요. 오늘 숙제 통과!", stickers: ["yum", "great"], stamp: "great", draw: (s) => [...bowl(0.55, 0.76, "brown"), ...person(0.25, 0.95, 0.9, s)] },
  { who: "subin", off: 1, board: "drawing", likes: 5, weather: "cloud", bg: "living-room", title: "고양이 입양", body: "보호소에서 고양이를 데려왔다. 이름은 두부.", teacher: "두부야 반가워! 오늘부터 집사 일기도 기대할게요.", stickers: ["sweet", "bravo"], stamp: "best", draw: (s) => [...person(0.35, 0.95, 1, s), ...cat(0.65, 0.68)] },
  { who: "subin", off: 4, cls: true, likes: 2, weather: "rain", bg: "rainy-window", title: "야근 후 라면", body: "야근하고 들어와서 라면을 끓였다. 세상에서 제일 맛있었다.", teacher: "야근 끝 라면은 반칙 맛이죠. 오늘 정말 수고했어요.", stickers: ["rest", "yum"], stamp: "thanks", draw: (s) => [...bowl(0.5, 0.78, "orange"), ...person(0.22, 0.95, 0.85, s)] },
  { who: "yerin", off: 3, board: "full", likes: 3, weather: "sun", bg: "home-table", title: "이직 첫 월급", body: "이직하고 첫 월급으로 부모님께 내복을 사 드렸다. 엄마가 웃으셨다.", teacher: "내복 선물은 전설의 효도템이에요. 참 잘했어요!", stickers: ["sweet", "great"], stamp: "great", draw: (s) => [...person(0.4, 0.95, 1, s), heart(0.7, 0.35, 0.05, "red")] },
  { who: "yerin", off: 5, board: "drawing", likes: 2, weather: "partly", bg: "flower-field", title: "구름 강아지", body: "점심 먹고 하늘을 봤는데 구름이 강아지 모양이었다.", teacher: "구름 강아지 목격담, 선생님도 보고 싶어요.", stickers: ["dream", "laugh"], stamp: "envy", draw: (s) => [...person(0.5, 0.95, 1, s), ...sun(0.85, 0.15, 0.04)] },
];

// 짝꿍 한마디: [일기 주인 key 또는 "fe", 그 일기 off, 쓴 사람 key 또는 "fe", 글]
const NOTES = [
  ["fe", 1, "jimin", "출근길에 나도 미끄러질 뻔! 조심해요"],
  ["fe", 4, "hajun", "열 쪽이면 저보다 많이 읽었네요 ㅋㅋ"],
  ["fe", 5, "doyun", "그 문방구 뽑기, 저도 꽝이었어요"],
  ["jimin", 0, "fe", "계란말이 서비스 부럽다!"],
  ["doyun", 0, "seoyeon", "저도 그 하늘 봤어요. 진짜 예뻤죠"],
  ["hajun", 3, "jimin", "싱거워도 감동이었을 거예요"],
  ["minjun", 0, "fe", "돈가스 집 위치 공유 부탁해요!"],
  ["subin", 4, "seoyeon", "야근 라면은 국룰이죠"],
  ["fe", 1, "minjun", "첫눈 사진도 올려 줘요"],
  ["seoyeon", 2, "hajun", "계란 두 개 인정합니다"],
];
const HW_LINES = ["생각보다 금방 했다", "하고 나니 뿌듯", "가족이 칭찬해 줬다", "증거는 마음속에 있어요", "내일도 해 볼까", "한 번에 성공!", "퇴근길에 해치웠다", "동료도 같이 했다", "사진은 부끄러워서 한 줄로", "이번 주 숙제 개근!"];
// 친구들 이번 달 지난 숙제 (며칠 전까지) · 반에 스티커 자랑한 친구
const FRIEND_HW_DAYS = [["jimin", 6], ["minjun", 8], ["hajun", 4], ["doyun", 3]];
const BRAGS = ["jimin", "minjun", "hajun"];
const HW_STICKERS = ["best", "great", "cool", "thanks", "proud", "hundred", "bravo", "laugh"];
const FRIEND_HW = [
  ["jimin", "점심시간에 해치웠어요. 생각보다 재밌다"],
  ["doyun", "퇴근길에 했어요. 버스 기다리면서"],
  ["yuna", "숙제 검사 받으려고 했는데 진짜 좋았어요"],
];

/* ---------- 저장소 그림 지우기 (게시판 카드) ---------- */
const FTP_ROOT = process.env.FTP_REMOTE_DIR || "/web/chamjal";
const PUBLIC_BASE = process.env.PUBLIC_ASSET_BASE || "https://yogibo.openhost.cafe24.com/web/chamjal";
function storedPath(url) {
  if (!url) return null;
  const rel = url.startsWith(`${PUBLIC_BASE}/`) ? url.slice(PUBLIC_BASE.length + 1) : url.startsWith("/_dev-uploads/") ? url.slice("/_dev-uploads/".length) : null;
  return rel && /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\/[a-z0-9]+-[a-f0-9]+\.[a-z]+$/.test(rel) ? { rel, ftp: url.startsWith(PUBLIC_BASE) } : null;
}
async function removeFiles(urls) {
  const items = urls.map(storedPath).filter(Boolean);
  const ftp = items.filter((i) => i.ftp);
  for (const i of items.filter((x) => !x.ftp)) fs.rmSync(path.join("public", "_dev-uploads", i.rel), { force: true });
  if (ftp.length && process.env.FTP_USER && process.env.FTP_PASS) {
    const client = new FtpClient(30_000);
    try {
      await client.access({
        host: process.env.FTP_HOST || "yogibo.ftp.cafe24.com",
        port: process.env.FTP_PORT ? Number(process.env.FTP_PORT) : 21,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASS,
        secure: false,
      });
      for (const i of ftp) await client.remove(`${FTP_ROOT}/${i.rel}`).catch(() => {});
    } finally {
      client.close();
    }
  }
  return items.length;
}

/* ---------- 지우기 ---------- */
async function remove() {
  const users = col("users");
  const demoUsers = await users.find({ demo: true }).project({ _id: 1 }).toArray();
  const ids = demoUsers.map((u) => u._id);
  const fe = await users.findOne({ googleSub: "id:fe" });
  const dq = { $or: [{ userId: { $in: ids } }, ...(fe ? [{ userId: fe._id, clientId: /^demo-/ }] : [])] };
  const ds = await col("diaries").find(dq).project({ _id: 1, board: 1 }).toArray();
  const dIds = ds.map((d) => d._id);
  const byDiaryOrUser = { $or: [{ diaryId: { $in: dIds } }, { userId: { $in: ids } }] };
  const demoClassIds = (await col("classes").find({ demo: true }).project({ _id: 1 }).toArray()).map((c) => c._id);
  const r = {
    reactions: (await col("reactions").deleteMany(byDiaryOrUser)).deletedCount,
    reports: (await col("reports").deleteMany(byDiaryOrUser)).deletedCount,
    notes: (await col("notes").deleteMany(byDiaryOrUser)).deletedCount,
    diaries: (await col("diaries").deleteMany(dq)).deletedCount,
    homework: (await col("homework").deleteMany({ $or: [{ userId: { $in: ids } }, { demo: true }] })).deletedCount,
    // 지난주 참 잘한 일기 상장은 fe 가 받았어도 예제 일기를 가리키면 같이 지운다 (남아 있으면 그 주 1~3등을 다시 안 센다)
    awards: (await col("awards").deleteMany({ $or: [{ userId: { $in: ids } }, { demo: true }, { diaryId: { $in: dIds } }] })).deletedCount,
    goneDiaries: (await col("goneDiaries").deleteMany({ $or: [{ userId: { $in: ids } }, ...(fe ? [{ userId: fe._id, clientId: /^demo-/ }] : [])] })).deletedCount,
    brags: (await col("brags").deleteMany({ $or: [{ userId: { $in: ids } }, { classId: { $in: demoClassIds } }] })).deletedCount,
    classes: (await col("classes").deleteMany({ demo: true })).deletedCount,
    users: (await users.deleteMany({ demo: true })).deletedCount,
  };
  if (ids.length) await col("classes").updateMany({ memberIds: { $in: ids } }, { $pull: { memberIds: { $in: ids } } });
  if (fe?.demoBackup) {
    const b = fe.demoBackup;
    await users.updateOne({ _id: fe._id }, { $set: { nickname: b.nickname, birth: b.birth ?? null, birthYear: b.birthYear ?? null }, $unset: { demoBackup: "" } });
  }
  const files = await removeFiles(ds.flatMap((d) => (d.board ? [d.board.cardUrl, d.board.thumbUrl] : [])));
  console.log(`예제 지움: ${JSON.stringify(r)}, 게시판 그림 ${files}장${fe?.demoBackup ? `, fe 이름표 되돌림(${fe.demoBackup.nickname})` : ""}`);
}

/* ---------- 만들기 ---------- */
async function build() {
  await remove();
  const users = col("users");
  const fe = await users.findOne({ googleSub: "id:fe" });
  if (!fe) throw new Error("fe 계정이 이 DB 에 없어요");
  const topicOf = async (date) => {
    const r = await fetch(`${BASE}/api/topic?date=${date}`).catch(() => null);
    if (!r?.ok) throw new Error(`${BASE} 서버에 연결이 안 돼요. 같은 DB 로 켜 둔 뒤 다시 해 주세요`);
    return (await r.json()).text;
  };
  await topicOf(TODAY);

  // fe: 이름표 길동, 생일 = 오늘 (오늘부터 3학년 8반)
  const feBirth = `${Number(TODAY.slice(0, 4)) - 38}-${TODAY.slice(5)}`;
  await users.updateOne(
    { _id: fe._id },
    { $set: { demoBackup: { nickname: fe.nickname, birth: fe.birth ?? null, birthYear: fe.birthYear ?? null }, nickname: "길동", birth: feBirth, birthYear: Number(feBirth.slice(0, 4)) } },
  );

  // 예제 친구
  const ids = { fe: fe._id };
  for (const f of FRIENDS) {
    const res = await users.insertOne({
      googleSub: `dev:${f.login}`,
      email: "demo@dev.local",
      nickname: f.nickname,
      birth: f.birth,
      birthYear: Number(f.birth.slice(0, 4)),
      kid: f.kid,
      createdAt: at(20, 12),
      lastSeenAt: at(0, 9),
      demo: true,
    });
    ids[f.key] = res.insertedId;
  }

  // 우리 반
  const code = Array.from(crypto.randomBytes(6), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
  const cls = await col("classes").insertOne({
    name: "퇴근 후 그림반",
    code,
    ownerId: fe._id,
    memberIds: [fe._id, ...FRIENDS.filter((f) => f.cls).map((f) => ids[f.key])],
    createdAt: at(14, 20),
    homework: { date: TODAY, text: "오늘 제일 맛있던 것" },
    demo: true,
  });

  // 일기
  const diaryDoc = (userId, key, d, shirt) => ({
    userId,
    clientId: `demo-${key}-${d.off}`,
    date: dayKey(d.off),
    weather: d.weather,
    title: d.title,
    body: d.body,
    strokes: d.draw(shirt),
    bg: d.bg,
    teacher: d.teacher,
    teacherBy: "ai",
    care: false,
    stickers: d.stickers,
    stamp: d.stamp,
    late: !!d.late,
    secret: !!d.secret,
    topic: null,
    topicText: null,
    createdAt: at(d.createdOff ?? d.off, 21, 30),
    updatedAt: at(d.createdOff ?? d.off, 21, 30),
    classIds: d.cls ? [cls.insertedId] : [],
    reactions: {},
  });
  const feDocs = FE_DIARIES.map((d) => diaryDoc(fe._id, "fe", d));
  const frDocs = FRIEND_DIARIES.map((d) => diaryDoc(ids[d.who], d.who, d, FRIENDS.find((f) => f.key === d.who).shirt));
  const inserted = await col("diaries").insertMany([...feDocs, ...frDocs]);
  const idOf = (who, off) => {
    const all = [...feDocs, ...frDocs];
    const i = all.findIndex((x) => x.clientId === `demo-${who}-${off}`);
    return inserted.insertedIds[i];
  };

  // 짝꿍 한마디
  await col("notes").insertMany(NOTES.map(([owner, off, by, text], i) => ({ diaryId: idOf(owner, off), userId: ids[by], text, at: at(Math.max(0, off - 0), 22, 10 + i) })));

  // 숙제 검사: fe 는 지난 6일, 친구 셋은 오늘 '보여 주기'
  const feHw = [];
  for (let off = 1; off <= 10; off++) {
    feHw.push({ userId: fe._id, date: dayKey(off), mission: await topicOf(dayKey(off)), text: HW_LINES[off - 1], photoUrl: null, thumbUrl: null, sticker: HW_STICKERS[off % HW_STICKERS.length], share: false, status: "visible", checked: false, at: at(off, 19), updatedAt: at(off, 19), demo: true });
  }
  const todayMission = await topicOf(TODAY);
  const frHw = FRIEND_HW.map(([who, text], i) => ({ userId: ids[who], date: TODAY, mission: todayMission, text, photoUrl: null, thumbUrl: null, sticker: HW_STICKERS[(i + 3) % HW_STICKERS.length], share: true, status: "visible", checked: true, at: at(0, 12 + i), updatedAt: at(0, 12 + i), demo: true }));
  // 친구들 이번 달 숙제 기록 (반 화면 '칭찬 스티커 자랑' 용, 보여 주기는 안 함)
  const frPast = [];
  for (const [who, days] of FRIEND_HW_DAYS) {
    for (let off = 1; off <= days; off++) {
      if (dayKey(off).slice(0, 7) !== TODAY.slice(0, 7)) break;
      frPast.push({ userId: ids[who], date: dayKey(off), mission: await topicOf(dayKey(off)), text: HW_LINES[(off + who.length) % HW_LINES.length], photoUrl: null, thumbUrl: null, sticker: HW_STICKERS[(off * 3 + who.length) % HW_STICKERS.length], share: false, status: "visible", checked: false, at: at(off, 20), updatedAt: at(off, 20), demo: true });
    }
  }
  await col("homework").insertMany([...feHw, ...frHw, ...frPast]);
  // 우리 반에 이번 달 칭찬 스티커 자랑
  await col("brags").insertMany(BRAGS.map((who, i) => ({ classId: cls.insertedId, userId: ids[who], month: TODAY.slice(0, 7), at: at(0, 8, i) })));

  // 상장: 일주일·한 달 개근상 (어제까지 30일 연속), 숙제 10번 (칭찬 스티커판 한 판)
  await col("awards").insertMany([
    { userId: fe._id, kind: "streak7", key: `streak7:${dayKey(30)}`, label: "일주일 개근상", detail: "7일 동안 하루도 빠짐없이 그림일기를 썼어요", at: at(24, 21, 40), demo: true },
    { userId: fe._id, kind: "streak30", key: `streak30:${dayKey(30)}`, label: "한 달 개근상", detail: "30일 동안 하루도 빠짐없이 그림일기를 썼어요", at: at(1, 21, 40), demo: true },
    { userId: fe._id, kind: "homework10", key: "homework10", label: "숙제 잘하는 어른이 상", detail: "오늘의 숙제를 10번이나 해냈어요", at: at(1, 19, 5), demo: true },
  ]);

  console.log(`예제 일기 ${feDocs.length + frDocs.length}편, 반 '퇴근 후 그림반'(초대 코드 ${code}), 짝꿍 한마디 ${NOTES.length}, 숙제 검사 ${feHw.length + frHw.length}`);

  // 게시판: 친구로 개발용 로그인해서 화면에서 진짜로 붙인다 (카드·미리보기 그림이 앱 그대로).
  // fe 는 비밀번호로만 들어오니, 같은 일기를 가진 임시 예제 친구(데모대신)로 붙인 뒤 게시판 상태(카드 그림)를 fe 일기로 옮긴다
  const tempId = (
    await users.insertOne({ googleSub: "dev:데모대신", email: "demo@dev.local", nickname: "길동", birth: feBirth, birthYear: Number(feBirth.slice(0, 4)), createdAt: at(1, 12), lastSeenAt: at(0, 9), demo: true })
  ).insertedId;
  const tempDocs = FE_BOARD.map((b) => {
    const src = { ...feDocs.find((x) => x.clientId === `demo-fe-${b.off}`) };
    delete src._id; // insertMany 가 붙인 _id 는 빼고 새로
    return { ...src, userId: tempId, clientId: `demo-tmp-${b.off}`, classIds: [] };
  });
  await col("diaries").insertMany(tempDocs);
  const jobs = [
    ...FRIENDS.map((f) => ({
      login: f.login,
      id: ids[f.key],
      name: f.nickname,
      posts: FRIEND_DIARIES.filter((d) => d.who === f.key && d.board),
      want: FRIEND_DIARIES.filter((d) => d.who === f.key).length,
    })),
    { login: "데모대신", id: tempId, name: "길동(fe)", posts: FE_BOARD.map((b) => ({ ...FE_DIARIES.find((d) => d.off === b.off), board: b.board })), want: tempDocs.length },
  ].filter((j) => j.posts.length);

  const edge = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
  const browser = await puppeteer.launch({ executablePath: edge, headless: true });
  try {
    for (const j of jobs) {
      const p = await (await browser.createBrowserContext()).newPage();
      await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await p.goto(`${BASE}/api/auth/dev?name=${encodeURIComponent(j.login)}&next=/diary`, { waitUntil: "networkidle0" });
      const me = await p.evaluate(async () => (await (await fetch("/api/me")).json()).user);
      if (me?.id !== j.id.toHexString()) throw new Error(`${BASE} 서버가 다른 DB 를 쓰고 있어요 (개발용 로그인이 예제 친구와 안 맞음)`);
      await p.evaluate((d) => {
        localStorage.setItem("chamjal.intro", "1");
        localStorage.setItem("chamjal.coverDay", d);
        localStorage.setItem("chamjal.aiConsent", "no");
        localStorage.setItem("chamjal.shelfView", "grid");
      }, new Date().toISOString().slice(0, 10));
      // 로그인하면 서버 일기를 이 기기로 받아 온다 → 내 일기장에 다 보일 때까지
      for (let i = 0; i < 8; i++) {
        await p.goto(`${BASE}/diary`, { waitUntil: "networkidle0" });
        await sleep(1500);
        if ((await p.$$(".shelf .mini")).length >= j.want) break;
      }
      for (const d of j.posts) {
        const opened = await p.evaluate((t) => {
          const el = [...document.querySelectorAll(".shelf .mini")].find((b) => b.querySelector(".ttl")?.textContent === t);
          el?.click();
          return !!el;
        }, d.title);
        if (!opened) throw new Error(`${j.name}의 '${d.title}' 를 일기장에서 못 찾았어요`);
        await p.waitForSelector(".card-preview", { timeout: 30000 });
        await p.evaluate(() => [...document.querySelectorAll("button.btn.plain")].find((b) => b.textContent?.trim() === "게시판에 붙이기")?.click());
        await p.waitForSelector(".plans .plan", { timeout: 10000 });
        await p.evaluate((m) => [...document.querySelectorAll(".plans .plan")].find((b) => b.textContent?.includes(m))?.click(), d.board === "full" ? "글까지" : "그림만");
        // 알림(토스트)은 앞 글 것이 남아 있을 수 있어서, 붙이기 응답을 기다린다
        const done = p.waitForResponse((r) => r.url().endsWith("/publish") && r.request().method() === "POST", { timeout: 90000 });
        await p.evaluate(() => [...document.querySelectorAll(".sheet-panel button.btn:not(.plain)")].find((b) => b.textContent?.trim() === "게시판에 붙이기")?.click());
        const res = await done;
        if (!res.ok()) throw new Error(`${j.name}의 '${d.title}' 게시판 붙이기 실패 (${res.status()})`);
        await p.waitForSelector(".plans", { hidden: true, timeout: 10000 });
        console.log(`  게시판: ${j.name} · ${d.title} (${d.board === "full" ? "글까지" : "그림만"})`);
        await p.keyboard.press("Escape");
        await sleep(800);
      }
      await p.close();
    }
  } finally {
    await browser.close();
  }

  // 임시 친구가 붙인 게시판 상태(카드 그림)를 fe 일기로 옮기고 임시 친구는 지운다 (그림은 이제 fe 일기가 쓴다)
  for (const b of FE_BOARD) {
    const t = await col("diaries").findOne({ userId: tempId, clientId: `demo-tmp-${b.off}` });
    if (t?.board) await col("diaries").updateOne({ _id: idOf("fe", b.off) }, { $set: { board: t.board } });
  }
  await col("diaries").deleteMany({ userId: tempId });
  await col("goneDiaries").deleteMany({ userId: tempId });
  await users.deleteOne({ _id: tempId });

  // 도장·스티커: 게시판 글(누구나) + 반에 낸 일기(반 친구끼리). 게시판에 붙인 날 = 일기 날 밤 (지난주 것은 '지난주 참 잘한 일기' 후보)
  const kinds = ["cham", "best", "heart", "star", "smile", "cheer"];
  const everyone = [fe._id, ...FRIENDS.map((f) => ids[f.key])];
  const classmates = [fe._id, ...FRIENDS.filter((f) => f.cls).map((f) => ids[f.key])];
  const targets = [
    ...FRIEND_DIARIES.filter((d) => d.board || d.cls).map((d) => ({ who: d.who, off: d.off, board: !!d.board, likes: d.likes ?? 2 })),
    ...FE_BOARD.map((b) => ({ who: "fe", off: b.off, board: true, likes: b.likes })),
    ...FE_DIARIES.filter((d) => d.cls).map((d) => ({ who: "fe", off: d.off, board: false, likes: 3 })),
  ];
  for (const t of targets) {
    const diaryId = idOf(t.who, t.off);
    const owner = ids[t.who];
    const rows = [];
    let n = 0;
    for (const v of (t.board ? everyone : classmates).filter((x) => !x.equals(owner))) {
      for (const k of kinds) {
        if (n >= t.likes) break;
        if (rnd() < 0.5) continue;
        rows.push({ diaryId, userId: v, kind: k, at: at(Math.max(0, t.off - 1), 9 + (n % 12)) });
        n++;
      }
    }
    if (rows.length) await col("reactions").insertMany(rows);
    const counts = rows.reduce((m, r) => ({ ...m, [r.kind]: (m[r.kind] ?? 0) + 1 }), {});
    await col("diaries").updateOne({ _id: diaryId }, { $set: { reactions: counts, ...(t.board ? { "board.at": at(t.off, 21, 45) } : {}) } });
  }
  console.log("게시판 도장·스티커 붙임. 끝!");
  console.log("보는 법: 시크릿 창 → /admin 에서 fe 로 들어가기 → / (표지: 생일 축하) · 내 일기장 · 우리 반 · 게시판 · 나(스티커판·상장)");
}

try {
  if (cmd === "build") await build();
  else await remove();
} finally {
  await mongo.close();
}
