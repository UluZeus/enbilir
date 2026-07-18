import { notFound } from "next/navigation";
import { VipPaywall } from "@/components/vip/VipPaywall";
import { VipResearchReportView } from "@/components/vip/VipResearchReportView";
import { getSafeLocale } from "@/i18n/config";
import { canAccessAdmin, getSessionUser } from "@/lib/auth";
import { getMembershipSnapshot } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VipReportDetail({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  const session = await getSessionUser();
  const membershipUser = session ? await prisma.user.findUnique({ where: { id: session.id }, select: { createdAt: true, membershipTier: true, vipPaidUntil: true } }) : null;
  const membership = membershipUser ? getMembershipSnapshot(membershipUser) : null;

  if (!session || (!membership?.isVipActive && !canAccessAdmin(session.role))) {
    return <VipPaywall locale={locale} isSignedIn={Boolean(session)} />;
  }

  const report = await prisma.vipResearchReport.findUnique({
    where: { id },
    include: { ideas: { orderBy: { rank: "asc" }, include: { evaluations: { orderBy: { dueAt: "asc" } } } } },
  });

  if (!report) {
    notFound();
  }

  return <VipResearchReportView report={report} locale={locale} showArchiveLink />;
}
