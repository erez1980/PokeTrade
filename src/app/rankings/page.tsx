import type { Metadata } from "next";
import { RankingsScreen } from "@/components/screens/RankingsScreen";

export const metadata: Metadata = { title: "דירוג נדירות" };
export default function Page() {
  return <RankingsScreen />;
}
