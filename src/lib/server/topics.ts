// 그날의 숙제 정하기 (서버): 선생님이 건 숙제가 있으면 그것, 없으면 lib/topics.ts 의 달력·요일 숙제

import { builtInTopic, type Topic } from "@/lib/topics";
import { cols, NoDbError } from "./db";

export async function resolveTopics(dates: string[]): Promise<Map<string, Topic>> {
  const out = new Map(dates.map((d) => [d, builtInTopic(d)]));
  try {
    const { topics } = await cols();
    for (const t of await topics.find({ date: { $in: dates } }).toArray()) {
      out.set(t.date, { date: t.date, text: t.text, kind: "teacher", subject: "선생님 숙제", note: t.note ?? null });
    }
  } catch (e) {
    if (!(e instanceof NoDbError)) throw e; // 서버 저장소가 없으면 요일 숙제만
  }
  return out;
}

export async function resolveTopic(date: string): Promise<Topic> {
  return (await resolveTopics([date])).get(date)!;
}

export const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
