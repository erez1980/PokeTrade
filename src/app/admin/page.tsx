import type { Metadata } from "next";
import { AdminScreen } from "@/components/screens/AdminScreen";

export const metadata: Metadata = { title: "Data quality", robots: { index: false, follow: false } };
export default function Page() {
  return <AdminScreen />;
}
