import type { Metadata } from "next";
import { CollectionScreen } from "@/components/screens/CollectionScreen";

export const metadata: Metadata = { title: "האוסף שלי" };
export default function Page() {
  return <CollectionScreen />;
}
