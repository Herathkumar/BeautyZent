import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { ResolveConflict } from "./ResolveConflict";

export default async function ConflictsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const conflicts = await prisma.syncConflict.findMany({
    where: { storeId: session.storeId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Shell userName={session.name}>
      <h1>Sync conflicts</h1>
      <p className="muted">
        Oversells and merge issues from offline POS devices land here.
      </p>
      <div className="panel">
        {conflicts.length === 0 ? (
          <p className="muted">No conflicts.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Status</th>
                <th>Message</th>
                <th>On hand</th>
                <th>Resolve</th>
              </tr>
            </thead>
            <tbody>
              {conflicts.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.createdAt).toLocaleString()}</td>
                  <td>
                    <span
                      className={`badge ${c.status === "open" ? "warn" : ""}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td>{c.message}</td>
                  <td>{c.onHand ?? "—"}</td>
                  <td>
                    {c.status === "open" ? (
                      <ResolveConflict
                        conflictId={c.id}
                        productId={c.productId}
                        suggested={c.onHand ?? 0}
                      />
                    ) : (
                      c.resolution
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
