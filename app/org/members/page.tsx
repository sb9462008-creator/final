import Sidebar from "@/components/sidebar";
import { getOrgContext, hasRole } from "@/lib/org";
import { getMembers, inviteMember, removeMemberRequest } from "@/lib/actions/org";

const cardStyle = {
  background: "rgba(13,13,26,0.8)",
  border: "1px solid rgba(56,189,248,0.15)",
  borderRadius: "12px",
};

const roleColors: Record<string, string> = {
  MANAGER: "#a855f7",
  STAFF: "#38bdf8",
  SUPER_ADMIN: "#f59e0b",
};

export default async function MembersPage() {
  const ctx = await getOrgContext();
  const { role, orgName } = ctx;
  const isManager = hasRole(ctx, "MANAGER");
  const members = await getMembers();

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      <Sidebar currentPath="/org/members" orgName={orgName} role={role} />
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#e2e8f0" }}>Members</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(226,232,240,0.5)" }}>
            Manage your organization members.
          </p>
        </div>

        <div className="space-y-6">
          {/* Invite form — manager only */}
          {isManager && (
            <div style={cardStyle} className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(56,189,248,0.7)" }}>
                Invite Member
              </h2>
              <form className="flex gap-3" action={async (formData: FormData) => {
                "use server";
                await inviteMember(formData);
              }}>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="colleague@company.com"
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    background: "rgba(56,189,248,0.05)",
                    border: "1px solid rgba(56,189,248,0.2)",
                    color: "#e2e8f0",
                  }}
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(90deg, #38bdf8, #7c3aed)", color: "white" }}
                >
                  Send Invite
                </button>
              </form>
            </div>
          )}

          {/* Members table */}
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(56,189,248,0.1)" }}>
                  {["Name", "Email", "Role", "Joined", ...(isManager ? ["Actions"] : [])].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest"
                      style={{ color: "rgba(56,189,248,0.6)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} style={{ borderBottom: "1px solid rgba(56,189,248,0.06)" }}
                    className="transition-colors hover:bg-[rgba(56,189,248,0.03)]">
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: "#e2e8f0" }}>
                      {member.displayName ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>
                      {member.email ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{
                          color: roleColors[member.role] ?? "#e2e8f0",
                          border: `1px solid ${roleColors[member.role] ?? "#e2e8f0"}30`,
                          background: `${roleColors[member.role] ?? "#e2e8f0"}10`,
                        }}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    {isManager && (
                      <td className="px-6 py-4 text-sm">
                        {member.userId !== ctx.userId && (
                          <form action={async () => {
                            "use server";
                            await removeMemberRequest(member.userId);
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
                              Request Remove
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={isManager ? 5 : 4} className="px-6 py-12 text-center text-sm"
                      style={{ color: "rgba(226,232,240,0.3)" }}>
                      No members found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
