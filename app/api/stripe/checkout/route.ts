import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getPriceId } from "@/lib/billing";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const BodySchema = z.object({
  plan: z.enum(["PRO", "ENTERPRISE"]),
});

export async function POST(request: NextRequest) {
  // 5 checkout attempts/min per IP — Stripe calls are expensive
  const limited = await rateLimit(request, { limit: 5, window: 60, identifier: "stripe:checkout" });
  if (limited) return limited;

  // Stripe not configured — return informative error
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRO_PRICE_ID) {
    return NextResponse.json(
      { error: "Billing is not yet available. Please contact us to upgrade your plan." },
      { status: 503 }
    );
  }

  try {
    // Use stackServerApp directly — getOrgContext() throws a redirect in API routes
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated.", redirect: "/sign-in" }, { status: 401 });
    }

    // Get member + org in one query
    const member = await prisma.member.findFirst({
      where: { userId: user.id },
      include: { organization: { select: { id: true, name: true, stripeCustomerId: true } } },
    });

    if (!member || !member.organization) {
      return NextResponse.json({ error: "No organization found.", redirect: "/onboarding" }, { status: 403 });
    }

    if (member.role !== "MANAGER" && member.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Managers can manage billing." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan selection." }, { status: 400 });
    }

    const { plan } = parsed.data;
    const stripe = getStripe();
    const org = member.organization;

    let customerId = org.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name ?? org.id,
        email: user.primaryEmail ?? undefined,
        metadata: { organizationId: org.id },
      });
      customerId = customer.id;

      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: getPriceId(plan), quantity: 1 }],
      metadata: { organizationId: org.id },
      success_url: `${baseUrl}/dashboard?billing=success`,
      cancel_url:  `${baseUrl}/pricing?billing=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json(
      { error: "Payment service error. Please try again." },
      { status: 500 }
    );
  }
}
