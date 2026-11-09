import { Suspense } from "react";
import Board from "@/components/admin/Board";

export default function Page() {
  return (
    <Suspense>
      <Board />
    </Suspense>
  );
}
