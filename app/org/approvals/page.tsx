import Sidebar from "@/components/sidebar";
import { getOrgContext, requireRole } from "@/lib/org";
import { getPendingRequests, approveMembershipRequest, rejectMembershipRequest } from "@/lib/actions/membership";

const cardStyle = {
  background: "rgba(13,13,26,0.8)",
  border: "1px solid rgba(56,189,248,0.15)",
  borderRadius: "12px",
};

const actionLabels: Record<string, string> = {
  ADD: "Add Member",
  REMOVE: "Remove Member",
  UPDATE_ROLE: "Update Role",
};

const actionColors: Record<string, string> = {
  ADD: "#38bdf8",
  REMOVE: "#ef4444",
  UPDATE_ROLE: "#a855f7",
};

export default async function ApprovalsPage() {
  const ctx = await getOrgContext();
  requireRole(ctx, "MANAGER");
  const requests = await getPendingRequests();

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      <Sidebar currentPath="/org/approvals" orgName={ctx.orgName} role={ctx.role} />
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#e2e8f0" }}>Approval Queue</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(226,232,240,0.5)" }}>
            Review and approve membership requests for your organization.
          </p>
        </div>

        <div style={cardStyle} className="overflow-hidden">
          {requests.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-sm" style={{ color: "rgba(226,232,240,0.4)" }}>
                No pending requests
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(56,189,248,0.1)" }}>
                  {["Action", "Target", "Requested By", "New Role", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest"
                      style={{ color: "rgba(56,189,248,0.6)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid rgba(56,189,248,0.06)" }}
                    className="transition-colors hover:bg-[rgba(56,189,248,0.03)]">
                    <td className="px-6 py-4 text-sm">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{
                          color: actionColors[req.action] ?? "#e2e8f0",
                          border: `1px solid ${actionColors[req.action] ?? "#e2e8f0"}30`,
                          background: `${actionColors[req.action] ?? "#e2e8f0"}10`,
                        }}
                      >
                        {actionLabels[req.action] ?? req.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "#e2e8f0" }}>
                      <div>{req.targetName ?? "Unknown"}</div>
                      <div className="text-xs" style={{ color: "rgba(226,232,240,0.4)" }}>{req.targetEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "rgba(226,232,240,0.6)" }}>
                      <div>{req.requesterName ?? "Unknown"}</div>
                      <div className="text-xs" style={{ color: "rgba(226,232,240,0.4)" }}>{req.requesterEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>
                      {req.newRole ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <form action={async () => {
                          "use server";
                          await approveMembershipRequest(req.id);
                        }}>
                          <button
                            type="submit"
                            className="text-xs font-semibold px-3 py-1 rounded transition-opacity hover:opacity-80"
                            style={{
                              color: "#38bdf8",
                              border: "1px solid rgba(56,189,248,0.3)",
                              background: "rgba(56,189,248,0.05)",
                            }}
                          >
                            Approve
                          </button>
                        </form>
                        <form action={async () => {
                          "use server";
                          await rejectMembershipRequest(req.id);
                        }}>
                          <button
                            type="submit"
                            className="text-xs font-semibold px-3 py-1 rounded transition-opacity hover:opacity-80"
                            style={{
                              color: "#ef4444",
                              border: "1px solid rgba(239,68,68,0.3)",
                              background: "rgba(239,68,68,0.05)",
                            }}
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
