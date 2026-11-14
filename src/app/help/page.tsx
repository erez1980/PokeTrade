import type { Metadata } from "next";
import { HelpScreen } from "@/components/screens/HelpScreen";

export const metadata: Metadata = { title: "שיטת דירוג הנדירות" };
export default function Page() {
  return <HelpScreen />;
}
