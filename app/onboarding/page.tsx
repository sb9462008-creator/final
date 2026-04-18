import { getPendingInvitesForUser, acceptInvite, createOrganization } from "@/lib/actions/org";
import OnboardingClient from "./client";

export default async function OnboardingPage() {
  const pendingInvites = await getPendingInvitesForUser();

  return (
    <OnboardingClient
      pendingInvites={pendingInvites}
      createOrganization={createOrganization}
      acceptInvite={acceptInvite}
    />
  );
}
