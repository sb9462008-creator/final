import { getPendingInvitesForUser, acceptInvite, createOrganization } from "@/lib/actions/org";
import OnboardingClient from "./client";
import { stackServerApp } from "@/stack/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  // Only check Stack Auth — do NOT call getOrgContext() here to avoid redirect loop
  const user = await stackServerApp.getUser();
  if (!user) redirect("/sign-in");

  const pendingInvites = await getPendingInvitesForUser();

  return (
    <OnboardingClient
      pendingInvites={pendingInvites}
      createOrganization={createOrganization}
      acceptInvite={acceptInvite}
    />
  );
}
