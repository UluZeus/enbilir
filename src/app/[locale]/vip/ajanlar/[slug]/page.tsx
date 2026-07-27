import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VipPaywall } from "@/components/vip/VipPaywall";
import { VipAgentDetailView } from "@/components/vip-agents/VipAgentViews";
import { getSafeLocale } from "@/i18n/config";
import { canAccessAdmin, getSessionUser } from "@/lib/auth";
import { getMembershipSnapshot } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { getVipAgentDailyTips, getVipAgentDetail } from "@/lib/vip-agents/dashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = getSafeLocale(rawLocale);
  return {
    title: `${slug.toLocaleUpperCase(locale === "tr" ? "tr-TR" : "en-US")} | Enbilir VIP`,
    alternates: { canonical: `/${locale}/vip/ajanlar/${slug}` },
    robots: { index: false, follow: false },
  };
}

export default async function VipAgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ tradePage?: string | string[]; decisionPage?: string | string[] }>;
}) {
  const [{ locale: rawLocale, slug }, history] = await Promise.all([params, searchParams]);
  const locale = getSafeLocale(rawLocale);
  const session = await getSessionUser();
  const user = session ? await prisma.user.findUnique({ where: { id: session.id }, select: { createdAt: true, membershipTier: true, vipPaidUntil: true } }) : null;
  const membership = user ? getMembershipSnapshot(user) : null;
  if (!session || (!membership?.isVipActive && !canAccessAdmin(session.role))) return <VipPaywall locale={locale} isSignedIn={Boolean(session)} />;
  const [agent, dailyTips] = await Promise.all([
    getVipAgentDetail(slug, history),
    getVipAgentDailyTips(),
  ]);
  if (!agent) notFound();
  const dailyTip = dailyTips.find((tip) => tip.agentSlug === agent.slug);
  return <VipAgentDetailView agent={agent} dailyTip={dailyTip} locale={locale} />;
}
