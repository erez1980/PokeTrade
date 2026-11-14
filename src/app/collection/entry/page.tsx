import type { Metadata } from "next";
import { CollectionEntryScreen } from "@/components/screens/CollectionEntryScreen";

export const metadata: Metadata = { title: "הוספה / עריכה באוסף" };
export default function Page() {
  return <CollectionEntryScreen />;
}
