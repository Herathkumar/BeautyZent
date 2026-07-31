import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { ChatPanel } from "@/components/ChatPanel";

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <Shell userName={session.name}>
      <h1>Staff AI ChatBot</h1>
      <p className="muted">
        Grounded tools for stock, sales, and confirmed inventory adjusts.
      </p>
      <ChatPanel role="staff" />
    </Shell>
  );
}
