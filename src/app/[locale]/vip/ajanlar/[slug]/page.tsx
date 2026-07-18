import { notFound } from "next/navigation";
import { VipPaywall } from "@/components/vip/VipPaywall";
import { VipAgentDetailView } from "@/components/vip-agents/VipAgentViews";
import { getSafeLocale } from "@/i18n/config";
import { canAccessAdmin, getSessionUser } from "@/lib/auth";
import { getMembershipSnapshot } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { getVipAgentDetail } from "@/lib/vip-agents/dashboard";

export const dynamic = "force-dynamic";

export default async function VipAgentDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale = getSafeLocale(rawLocale);
  const session = await getSessionUser();
  const user = session ? await prisma.user.findUnique({ where: { id: session.id }, select: { createdAt: true, membershipTier: true, vipPaidUntil: true } }) : null;
  const membership = user ? getMembershipSnapshot(user) : null;
  if (!session || (!membership?.isVipActive && !canAccessAdmin(session.role))) return <VipPaywall locale={locale} isSignedIn={Boolean(session)} />;
  const agent = await getVipAgentDetail(slug);
  if (!agent) notFound();
  return <VipAgentDetailView agent={agent} locale={locale} />;
}
