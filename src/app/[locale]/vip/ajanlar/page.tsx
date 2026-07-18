import type { Metadata } from "next";
import { VipPaywall } from "@/components/vip/VipPaywall";
import { VipAgentOverview } from "@/components/vip-agents/VipAgentViews";
import { getSafeLocale } from "@/i18n/config";
import { canAccessAdmin, getSessionUser } from "@/lib/auth";
import { getMembershipSnapshot } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { getVipAgentSummaries } from "@/lib/vip-agents/dashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return {
    title: locale === "tr" ? "VIP Sanal Ajanlar | Enbilir" : "VIP Virtual Agents | Enbilir",
    alternates: { canonical: `/${locale}/vip/ajanlar` },
    robots: { index: false, follow: false },
  };
}

export default async function VipAgentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const session = await getSessionUser();
  const user = session ? await prisma.user.findUnique({ where: { id: session.id }, select: { createdAt: true, membershipTier: true, vipPaidUntil: true } }) : null;
  const membership = user ? getMembershipSnapshot(user) : null;
  if (!session || (!membership?.isVipActive && !canAccessAdmin(session.role))) return <VipPaywall locale={locale} isSignedIn={Boolean(session)} />;
  const agents = await getVipAgentSummaries();
  return <VipAgentOverview agents={agents} locale={locale} />;
}
