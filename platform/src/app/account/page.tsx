import type { Metadata } from "next";
import { AccountDashboard } from "./AccountDashboard";

export const metadata: Metadata = {
  title: "My account — BeautyZent",
  description: "Manage your BeautyZent bookings, favorites, rewards, and profile.",
};

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return <AccountDashboard />;
}
