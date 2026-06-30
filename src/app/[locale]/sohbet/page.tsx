import type { Metadata } from "next";
import { AiMarketChatPanel } from "@/components/ai-market/AiMarketChatPanel";
import { ChatRoomClient } from "@/components/ChatRoomClient";
import { SiteMotion } from "@/components/SiteMotion";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { generalChatRoomCode, getChatRoomState, normalizeRoomCode } from "@/lib/chat";
import { getMembershipSnapshot, membershipConfig } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/sohbet", page: "chat" });
}

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ oda?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const sessionUser = await getSessionUser();
  const initialRoomCode = normalizeRoomCode(query.oda) || generalChatRoomCode;
  const [initialState, membershipUser] = await Promise.all([
    sessionUser ? getChatRoomState({ user: sessionUser, roomCode: initialRoomCode }) : Promise.resolve(null),
    sessionUser
      ? prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: { createdAt: true, membershipTier: true, vipPaidUntil: true },
        })
      : Promise.resolve(null),
  ]);
  const membership = membershipUser ? getMembershipSnapshot(membershipUser) : null;

  return (
    <div className="grid gap-5">
      <section className="premium-card p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
              {locale === "tr" ? "Canlı topluluk merkezi" : "Live community center"}
            </p>
            <h1 className="mt-2 text-3xl font-black text-[#152033]">
              {locale === "tr" ? "Genel sohbet, özel odalar ve AI piyasa sohbeti aynı yerde." : "General chat, private rooms, and AI market chat in one place."}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {locale === "tr"
                ? "Genel sohbet odası doğrudan açılır. Dilersen özel oda oluşturup kodunu arkadaşına iletebilir, dosya, resim, video, konum, kişi bilgisi ve anket paylaşabilirsin. Yazılanlar kullanıcıların kendi görüşüdür; siteyi veya Dr. Hakan Ünsal'ı bağlamaz."
                : "The general chat room opens directly. You can create a private room, share its code with a friend, and send files, images, videos, location, contact details, or polls. Messages belong to users and do not represent the site or Dr. Hakan Unsal."}
            </p>
          </div>
          <div className="site-page-side-motion">
            <SiteMotion variant="network" />
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <p className="text-sm font-black">{locale === "tr" ? "Kısa topluluk hatırlatması" : "Community reminder"}</p>
              <p className="mt-2 text-sm leading-6">
                {locale === "tr"
                  ? "Saygılı dil, kişisel veriye dikkat, yatırım tavsiyesi vermeme ve yanıltıcı bilgi paylaşmama kuralı geçerlidir. Şikayet edilen mesajlar admin panelinden izlenebilir."
                  : "Respectful language, care with personal data, no investment advice, and no misleading information are required. Reported messages can be reviewed from the admin panel."}
              </p>
            </div>
          </div>
        </div>
      </section>
      <AiMarketChatPanel
        locale={locale}
        membershipTier={membership?.effectiveTier ?? "STANDARD"}
        vipPaidUntil={membership?.vipPaidUntil?.toISOString() ?? null}
        standardPaymentLink={membershipConfig.standardPaymentLink}
        vipPaymentLink={membershipConfig.vipPaymentLink}
      />
      <ChatRoomClient
        locale={locale}
        authenticated={Boolean(sessionUser)}
        loginHref={`/${locale}/giris?returnTo=${encodeURIComponent(`/${locale}/sohbet`)}`}
        initialRoomCode={initialRoomCode}
        initialState={initialState}
      />
    </div>
  );
}
