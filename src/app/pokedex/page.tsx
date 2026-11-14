import type { Metadata } from "next";
import { PokedexScreen } from "@/components/screens/PokedexScreen";

export const metadata: Metadata = { title: "כל הפוקימונים" };
export default function Page() {
  return <PokedexScreen />;
}
