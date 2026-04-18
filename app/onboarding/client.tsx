"use client";

import { useState } from "react";
import Logo from "@/components/logo";

interface PendingInvite {
  id: string;
  orgName: string;
  organizationId: string;
  createdAt: Date;
}

interface Props {
  pendingInvites: PendingInvite[];
  createOrganization: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  acceptInvite: (inviteId: string) => Promise<{ error?: string; success?: boolean }>;
}

export default function OnboardingClient({ pendingInvites, createOrganization, acceptInvite }: Props) {
  const [tab, setTab] = useState<"create" | "wait">(pendingInvites.length > 0 ? "wait" : "create");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createOrganization(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleAccept(inviteId: string) {
    setAcceptingId(inviteId);
    const result = await acceptInvite(inviteId);
    if (result?.error) {
      setError(result.error);
      setAcceptingId(null);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.08) 0%, rgba(168,85,247,0.06) 40%, #0a0a0f 70%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-8">
          <Logo size={72} />
          <h1
            className="mt-4 text-2xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(90deg, #38bdf8, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Welcome to Inventory App
          </h1>
          <p className="text-sm mt-2 text-center" style={{ color: "rgba(226,232,240,0.5)" }}>
            Create your organization or accept a pending invitation.
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-lg p-1 mb-6"
          style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)" }}
        >
          {(["create", "wait"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className="flex-1 py-2 text-sm font-medium rounded-md transition-all relative"
              style={
                tab === t
                  ? { background: "linear-gradient(90deg, #38bdf8, #7c3aed)", color: "white" }
                  : { color: "rgba(226,232,240,0.5)" }
              }
            >
              {t === "create" ? "Create Organization" : (
                <span className="flex items-center justify-center gap-1.5">
                  Pending Invites
                  {pendingInvites.length > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        background: tab === "wait" ? "rgba(255,255,255,0.25)" : "#38bdf8",
                        color: "white",
                        minWidth: "18px",
                      }}
                    >
                      {pendingInvites.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
          >
            {error}
          </div>
        )}

        {/* Create org */}
        {tab === "create" && (
          <div
            className="p-6 rounded-xl"
            style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(56,189,248,0.15)" }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: "#e2e8f0" }}>
              Create your organization
            </h2>
            <form action={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "rgba(226,232,240,0.7)" }}>
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Acme Corp"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    background: "rgba(56,189,248,0.05)",
                    border: "1px solid rgba(56,189,248,0.2)",
                    color: "#e2e8f0",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(90deg, #38bdf8, #7c3aed)", color: "white" }}
              >
                {loading ? "Creating..." : "Create Organization"}
              </button>
            </form>
          </div>
        )}

        {/* Pending invites */}
        {tab === "wait" && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(56,189,248,0.15)" }}
          >
            {pendingInvites.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-4">📬</div>
                <h2 className="text-base font-semibold mb-2" style={{ color: "#e2e8f0" }}>
                  No pending invitations
                </h2>
                <p className="text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>
                  Ask your organization manager to invite you by your account email address.
                </p>
              </div>
            ) : (
              <div>
                <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(56,189,248,0.1)" }}>
                  <h2 className="text-base font-semibold" style={{ color: "#e2e8f0" }}>
                    You have {pendingInvites.length} pending invitation{pendingInvites.length > 1 ? "s" : ""}
                  </h2>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(56,189,248,0.08)" }}>
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                          {invite.orgName}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "rgba(226,232,240,0.4)" }}>
                          Invited {new Date(invite.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAccept(invite.id)}
                        disabled={acceptingId === invite.id}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: "linear-gradient(90deg, #38bdf8, #7c3aed)", color: "white" }}
                      >
                        {acceptingId === invite.id ? "Joining..." : "Accept"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
