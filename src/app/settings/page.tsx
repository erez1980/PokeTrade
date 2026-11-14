import type { Metadata } from "next";
import { SettingsScreen } from "@/components/screens/SettingsScreen";

export const metadata: Metadata = { title: "הגדרות" };
export default function Page() {
  return <SettingsScreen />;
}
