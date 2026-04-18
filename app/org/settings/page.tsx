import Sidebar from "@/components/sidebar";
import { getOrgContext, requireRole } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { deleteOrganization } from "@/lib/actions/org";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const cardStyle = {
  background: "rgba(13,13,26,0.8)",
  border: "1px solid rgba(56,189,248,0.15)",
  borderRadius: "12px",
};

const inputStyle = {
  background: "rgba(56,189,248,0.05)",
  border: "1px solid rgba(56,189,248,0.2)",
  color: "#e2e8f0",
  borderRadius: "8px",
};

export default async function OrgSettingsPage() {
  const ctx = await getOrgContext();
  requireRole(ctx, "MANAGER");

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
  });

  if (!org) return <div>Organization not found.</div>;

  async function updateOrgName(formData: FormData) {
    "use server";
    const innerCtx = await getOrgContext();
    requireRole(innerCtx, "MANAGER");
    const nameResult = z.string().trim().min(1).max(100).safeParse(formData.get("name"));
    if (!nameResult.success) return;
    await prisma.organization.update({
      where: { id: innerCtx.organizationId },
      data: { name: nameResult.data },
    });
    revalidatePath("/org/settings");
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      <Sidebar currentPath="/org/settings" orgName={ctx.orgName ?? org.name} role={ctx.role} />
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#e2e8f0" }}>Organization Settings</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(226,232,240,0.5)" }}>
            Manage your organization details.
          </p>
        </div>

        <div className="max-w-xl space-y-6">
          {/* Org name */}
          <div style={cardStyle} className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(56,189,248,0.7)" }}>
              Organization Name
            </h2>
            <form action={updateOrgName} className="space-y-4">
              <input
                type="text"
                name="name"
                defaultValue={org.name}
                required
                maxLength={100}
                className="w-full px-4 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(90deg, #38bdf8, #7c3aed)", color: "white" }}
              >
                Save Changes
              </button>
            </form>
          </div>

          {/* Org info */}
          <div style={cardStyle} className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(56,189,248,0.7)" }}>
              Organization Info
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "rgba(226,232,240,0.5)" }}>Organization ID</span>
                <span className="font-mono text-xs" style={{ color: "#38bdf8" }}>{org.id}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "rgba(226,232,240,0.5)" }}>Created</span>
                <span style={{ color: "#e2e8f0" }}>{new Date(org.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "rgba(226,232,240,0.5)" }}>Your Role</span>
                <span style={{ color: "#a855f7" }}>{ctx.role}</span>
              </div>
            </div>
          </div>
          {/* Danger zone */}
          <div style={{ ...cardStyle, border: "1px solid rgba(239,68,68,0.3)" }} className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: "#ef4444" }}>
              Danger Zone
            </h2>
            <p className="text-sm mb-4" style={{ color: "rgba(226,232,240,0.5)" }}>
              Deleting the organization will permanently remove all members, products, and data. This cannot be undone.
            </p>
            <form action={deleteOrganization}>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.4)",
                  background: "rgba(239,68,68,0.08)",
                }}
              >
                Delete Organization
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
