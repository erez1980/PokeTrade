import type { Metadata } from "next";
import { WishlistScreen } from "@/components/screens/WishlistScreen";

export const metadata: Metadata = { title: "רשימת משאלות" };
export default function Page() {
  return <WishlistScreen />;
}
