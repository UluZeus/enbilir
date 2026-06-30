import type { Metadata } from "next";
import Link from "next/link";
import { ManagedContentList } from "@/components/ManagedContentList";
import { SiteMotion } from "@/components/SiteMotion";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getManagedContentItems } from "@/lib/managed-content";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/blog", page: "blog" });
}

type BlogCategoryCode = "ALL" | "FINANCIALS" | "CRYPTO" | "MACRO" | "RISK" | "COMMUNITY";

const blogCategoryByPostId: Record<string, Exclude<BlogCategoryCode, "ALL">> = {
  "managed-bilanco-okuma-teknikleri": "FINANCIALS",
  "managed-finansci-olmayanlar-finansal-tablo": "FINANCIALS",
  "managed-kripto-piyasasi-temel-kavramlar": "CRYPTO",
  "managed-kripto-para-dijital-para-farki": "CRYPTO",
  "managed-borsalara-yatirimda-dikkat": "RISK",
  "managed-rezerv-para-tarihi-dolar": "MACRO",
  "managed-degerli-metaller-para-sistemi": "MACRO",
  "managed-finansal-kararlarda-psikoloji": "RISK",
  "managed-portfoy-gunlugu-tutmak": "RISK",
  "managed-home-community-learning": "COMMUNITY",
  "managed-home-market-calm-decision": "RISK",
  "managed-home-virtual-portfolio-serious": "RISK",
  "icerik2-piyasayi-anlamak": "RISK",
  "icerik2-piyasa-heyecani-bilinci": "RISK",
  "icerik2-sanal-portfoy-kazanc-degil": "RISK",
  "icerik2-risk-yonetimi-hazirlik": "RISK",
  "icerik2-guclu-sinyal-sorular": "RISK",
  "icerik2-acele-eden-degil-dusunen": "RISK",
  "icerik2-piyasa-gurultusu-gercek-bilgi": "RISK",
  "icerik2-portfoyde-kaybetmeyi-ogrenmek": "RISK",
  "icerik2-piyasada-sabir-pasiflik-degil": "RISK",
  "icerik2-duyduguna-degil-anladigina-guven": "RISK",
  "icerik2-portfoyde-denge": "RISK",
  "icerik2-gunluk-heyecan-uzun-vadeli-ogrenme": "RISK",
};

function getBlogCategory(postId: string) {
  const normalizedId = postId.endsWith("-en") ? postId.slice(0, -3) : postId;
  return blogCategoryByPostId[normalizedId];
}

function getBlogCategoryLabels(locale: string): Record<BlogCategoryCode, string> {
  if (locale === "en") {
    return {
      ALL: "All",
      FINANCIALS: "Financial statements",
      CRYPTO: "Crypto",
      MACRO: "Macro",
      RISK: "Risk psychology",
      COMMUNITY: "Community",
    };
  }

  return {
    ALL: "Tümü",
    FINANCIALS: "Bilanço",
    CRYPTO: "Kripto",
    MACRO: "Makro",
    RISK: "Risk Psikolojisi",
    COMMUNITY: "Topluluk",
  };
}

function getSafeBlogCategory(value: string | undefined): BlogCategoryCode {
  return ["ALL", "FINANCIALS", "CRYPTO", "MACRO", "RISK", "COMMUNITY"].includes(value ?? "")
    ? value as BlogCategoryCode
    : "ALL";
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ kategori?: string; category?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).simplePages.blog;
  const posts = await getManagedContentItems({ type: "BLOG", locale });
  const selectedCategory = getSafeBlogCategory(query.kategori ?? query.category);
  const categoryLabels = getBlogCategoryLabels(locale);
  const categoryOptions = Object.entries(categoryLabels) as Array<[BlogCategoryCode, string]>;
  const filteredPosts = selectedCategory === "ALL"
    ? posts
    : posts.filter((post) => getBlogCategory(post.id) === selectedCategory);
  const starterPosts = getStarterPosts(locale);
  const contentCalendar = getContentCalendar(locale);
  const evergreenNotes = getEvergreenNotes(locale);

  return (
    <div className="grid gap-6">
      <section className="premium-card premium-card--interactive p-6">
        <div className="site-page-hero-grid">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{locale === "en" ? "Enbilir reading room" : "Enbilir okuma alanı"}</p>
            <h1 className="mt-2 text-3xl font-black text-[#152033]">{copy.title}</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{copy.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {categoryOptions.map(([code, label]) => (
                <Link
                  key={code}
                  href={code === "ALL" ? `/${locale}/blog` : `/${locale}/blog?kategori=${code}`}
                  aria-current={selectedCategory === code ? "page" : undefined}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                    selectedCategory === code
                      ? "border-[#0f766e] bg-[#0f766e] text-white"
                      : "border-slate-200 bg-white/80 text-slate-700 hover:border-[#0f766e] hover:text-[#0f766e]"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="site-page-hero-motion">
            <SiteMotion variant={selectedCategory === "CRYPTO" ? "crypto" : selectedCategory === "MACRO" ? "macro" : selectedCategory === "COMMUNITY" ? "community" : "trend"} />
          </div>
        </div>
      </section>
      {selectedCategory === "COMMUNITY" ? (
        <section className="premium-card premium-card--interactive p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
                {locale === "en" ? "Live community chat" : "Canlı topluluk sohbeti"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#152033]">
                {locale === "en" ? "Join the Enbilir chat room" : "Enbilir sohbet odasına katıl"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                {locale === "en"
                  ? "Members can meet in the general room, open private rooms with shareable links, and appear with the name or nickname they selected."
                  : "Üyeler genel odada buluşabilir, paylaşılabilir linkle özel oda açabilir ve daha önce seçtikleri ad veya rumuzla görünebilir."}
              </p>
            </div>
            <Link href={`/${locale}/sohbet`} className="premium-action inline-flex shrink-0 px-5 py-3 text-sm font-black">
              {locale === "en" ? "Open chat" : "Sohbeti aç"}
            </Link>
          </div>
        </section>
      ) : null}
      <section className="premium-card premium-card--interactive p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
          {locale === "tr" ? "Haftalık içerik takvimi" : "Weekly content calendar"}
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#152033]">
          {locale === "tr" ? "Her günün amacı farklı: oku, uygula, karşılaştır, değerlendir." : "Each day has a role: read, apply, compare, and review."}
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
          {locale === "tr"
            ? "Bu takvim yalnızca yayın planı değildir. Enbilir'i düzenli kullanan bir kişinin haftalık öğrenme ritmini anlatır. Pazartesi kavramı açar, Çarşamba mini dersle sadeleştirir, Cuma sanal portföye bağlar, Pazar ise liderlik ve topluluk üzerinden haftayı değerlendirir."
            : "This is more than a publishing plan. It describes a weekly learning rhythm for Enbilir users: Monday opens the concept, Wednesday simplifies it, Friday connects it to virtual portfolios, and Sunday reviews the week through rankings and community reflection."}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {contentCalendar.map((item) => (
            <a key={item.day} href={`#${item.id}`} className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:ring-[#0f766e]/50">
              <p className="text-sm font-black text-[#152033]">{item.day}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#0f766e]">{item.theme}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </a>
          ))}
        </div>
      </section>
      <section className="grid gap-4">
        {contentCalendar.map((item) => (
          <article key={item.id} id={item.id} className="premium-card premium-card--interactive p-6 scroll-mt-32">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{item.day} · {item.theme}</p>
                <h2 className="mt-2 text-2xl font-black text-[#152033]">{item.title}</h2>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{item.body}</p>
              </div>
              <Link href={item.ctaHref} className="premium-action inline-flex shrink-0 px-4 py-2 text-xs font-black">
                {item.ctaLabel}
              </Link>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-4 text-sm leading-7 text-slate-600">
                {item.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <aside className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  {locale === "tr" ? "Bu günün uygulaması" : "Practice for this day"}
                </p>
                <p className="mt-2 text-sm font-black text-[#152033]">{item.practiceTitle}</p>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                  {item.checklist.map((entry) => (
                    <li key={entry}>• {entry}</li>
                  ))}
                </ul>
              </aside>
            </div>
          </article>
        ))}
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {evergreenNotes.map((item) => (
          <article key={item.title} className="premium-card premium-card--interactive p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{item.eyebrow}</p>
            <h2 className="mt-2 text-xl font-black text-[#152033]">{item.title}</h2>
            <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600">
              {item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </article>
        ))}
      </section>
      {posts.length > 0 ? (
        <ManagedContentList
          items={filteredPosts}
          emptyTitle={locale === "en" ? "No article in this category yet" : "Bu kategoride henüz yazı yok"}
          emptyBody={locale === "en" ? "Try another category or return to all articles." : "Başka bir kategori seçebilir veya tüm yazılara dönebilirsin."}
          featuredLabel={locale === "en" ? "Featured" : "Öne çıkan"}
          showBody={false}
          linkBasePath={`/${locale}/blog`}
          linkLabel={locale === "en" ? "Read article" : "Yazıyı oku"}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {starterPosts.map((post) => (
            <article key={post.title} className="premium-card premium-card--interactive p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{post.tag}</p>
              <h2 className="mt-2 text-xl font-black text-[#152033]">{post.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
              <div className="mt-4 rounded-xl bg-[#f8fafc] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{locale === "tr" ? "SEO anahtarları" : "SEO keywords"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{post.keywords.join(" • ")}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function getEvergreenNotes(locale: string) {
  if (locale === "en") {
    return [
      {
        eyebrow: "Market literacy",
        title: "Why does financial literacy need repetition?",
        paragraphs: [
          "Financial literacy is not built by reading one article once. It becomes useful only when a person can return to the same ideas in different situations and still use them calmly. Knowing what inflation means, recognizing the word risk, or seeing a trend line on a chart is a beginning; it is not the whole skill. The real test comes when the user has to interpret a moving market, compare alternatives, and decide what not to do.",
          "This is why repetition matters. The same concept should appear first in a simple explanation, then in a chart, then in a virtual portfolio decision, then in a league conversation, and later again inside a macro report. When a user meets the same idea from different angles, it stops being a memorized sentence and starts becoming part of their decision language.",
          "Good repetition is not mechanical. Saying the same phrase every week does not make anyone more literate. What matters is applied repetition: looking at gold one day through the lens of safe-haven behavior, looking at Nasdaq another day through growth expectations, and then comparing currency movements with central-bank expectations. The user slowly learns that markets are not random noise; they are a set of questions that must be asked again and again.",
          "Enbilir is designed around that chain. A blog article opens the concept. An education card simplifies it. A virtual portfolio lets the user test it safely. A league makes the learning visible inside a trusted community. The AI assistant and macro reports then connect the same concept to current market context. At that point the user is not merely reading; they are practicing, comparing, and reviewing their own behavior.",
          "This is also why virtual portfolio practice has value. It shows the user their own reflexes without real-money pressure. Do they chase the asset that has already moved? Do they hold too much of one idea? Do they panic when a position falls? These behaviors are part of financial literacy because decisions are never only about data; they are also about temperament.",
          "Markets change every day, but the quality questions stay surprisingly stable: What am I looking at? What time frame am I using? What is my risk? What would prove me wrong? Repetition keeps those questions alive. It helps the user slow down, write the reason for a decision, and evaluate the result without turning every outcome into ego.",
        ],
      },
      {
        eyebrow: "Community learning",
        title: "Why can community-based learning outperform solo learning?",
        paragraphs: [
          "Following markets often looks like a solitary activity. A person sits in front of a screen, reads headlines, checks prices, and makes a decision. That individual responsibility is real; no community should replace personal judgment. But learning itself does not have to be lonely. In many cases, the right community makes learning more consistent, more reflective, and more durable.",
          "Community-based learning turns information into conversation. A user may think they understood a signal until another member asks a simple question: Why did you read it that way? What would change your view? Did you consider risk, or only upside? Questions like these are often more educational than long lectures because they make the user explain the reasoning behind the decision.",
          "This is especially powerful in Rotary and Rotaract-style groups where trust already exists. Members can discuss a market move without turning the conversation into investment advice. One person may explain why gold looks defensive, another may question whether technology shares are too crowded, and another may bring macro context into the discussion. The value is not that everyone reaches the same conclusion; the value is that everyone learns to think more clearly.",
          "There is an important boundary. A community learning environment must not become a place where people tell each other what to buy or sell. The purpose is not direction; it is better reasoning. Enbilir keeps that line visible by using virtual portfolios, education-first language, AI explanations, and repeated reminders that the platform is not investment advice.",
          "The league structure adds rhythm. A person can abandon an individual learning plan easily, but a weekly league, a recurring report, a badge, or a shared portfolio review creates gentle accountability. The social loop does not need to pressure anyone; it simply brings people back to the learning process.",
          "The best communities also teach people how to read success more intelligently. A user may rank high for a short period because of one lucky move, while another user may be building a more careful and sustainable process. Discussing that difference is more valuable than simply applauding the top number. It teaches users to separate outcome from process.",
          "That is the deeper purpose of Enbilir’s leagues, badges, reports, and virtual portfolio flow. They are not only gamification layers. Used well, they make learning visible. The user sees their own development, benefits from another person’s question, and still keeps responsibility for their own decisions.",
        ],
      },
    ] as const;
  }

  return [
    {
      eyebrow: "Kalıcı İçerik",
      title: "Finansal okuryazarlık neden tekrar ister, neden tek yazıyla olmaz?",
      paragraphs: [
        "Finansal okuryazarlık bir defalık bilgi aktarımıyla oluşmaz. Bunu özellikle vurgulamak gerekir. Çünkü piyasayı izleyen birçok kişi ilk heyecanla birkaç kavram öğrenir, birkaç göstergeye bakar ve kendisini karar vermeye hazır hisseder. Oysa gerçek mesele yalnızca kavramı bilmek değil, o kavramı doğru zamanda, doğru bağlamda ve sakin bir zihinle kullanabilmektir.",
        "OECD'nin finansal okuryazarlık çalışmalarında bilgi, davranış ve tutum birlikte ele alınır. Bu ayrım çok önemlidir. Kişi faizin ne olduğunu bilebilir, enflasyonun alım gücünü düşürdüğünü anlayabilir, riskin ne demek olduğunu tarif edebilir. Fakat karar anında bütün parasını tek varlığa yönlendiriyorsa, zarar ihtimalini yazmadan işlem yapıyorsa veya sadece kalabalığın heyecanıyla hareket ediyorsa bilgi davranışa dönüşmemiş demektir.",
        "Benim burada önemsediğim nokta tam olarak budur: finansal eğitim, sadece anlatıldığı için değil, tekrar tekrar kullanıldığı için kalıcı hale gelir. Bir kavram önce yazıda okunur, sonra grafikte görülür, ardından sanal portföyde denenir, lig içinde konuşulur ve raporda yeniden bağlama oturur. Aynı kavram farklı yerlerde tekrarlandığında artık ezber olmaktan çıkar; kişinin kendi karar diline yerleşmeye başlar.",
        "Tekrarın değeri basit tekrar değildir. Aynı cümleyi sürekli söylemek kimseyi daha bilinçli yapmaz. Değerli olan tekrar, her seferinde küçük bir uygulama ile birlikte gelen tekrardır. Kullanıcı bir gün altını incelerken riskten korunmayı düşünür, başka bir gün Nasdaq tarafında büyüme beklentisini tartar, sonraki gün dövizde merkez bankası etkisini görür. Böylece konu teoriden çıkar ve günlük piyasa okumasına dönüşür.",
        "Finansal kararlarda insanın kendi davranışını görmesi de en az piyasa verisi kadar önemlidir. Bir kullanıcı hep yükselen varlığa geç kalmış gibi koşuyorsa bunu fark etmelidir. Düşen varlıkta sadece ucuzladı diye acele ediyorsa bunu da görmelidir. Sanal portföy burada güvenli bir ayna görevi görür. Gerçek para baskısı olmadan yapılan kararlar, kişinin reflekslerini daha rahat gösterir.",
        "Bu nedenle Enbilir'de içeriklerin birbirinden kopuk durmaması gerekir. Blog yazısı kavramı açmalı, eğitim kartı bunu sadeleştirmeli, makro rapor güncel piyasaya bağlamalı, portföy ekranı uygulamayı göstermeli, lig ise bu süreci topluluk içinde görünür kılmalıdır. Bu zincir çalıştığında kullanıcı sadece okumuş olmaz; denemiş, karşılaştırmış ve kendi davranışını ölçmüş olur.",
        "Piyasada herkes zaman zaman yanılır. Önemli olan yanılmamak değildir. Önemli olan, aynı yanılgıyı fark etmeden tekrar etmemektir. Finansal okuryazarlık da burada başlar. Kişi kendi kararını yazabiliyor, gerekçesini anlatabiliyor, ters senaryosunu düşünebiliyor ve sonrasında sonucu soğukkanlı biçimde değerlendirebiliyorsa artık bilgi davranışa yaklaşmış demektir.",
        "Bu yüzden finansal okuryazarlık tekrar ister. Çünkü piyasa her gün değişir ama iyi kararın temel soruları değişmez: Neye bakıyorum? Hangi vadede düşünüyorum? Riskim ne? Yanılırsam ne yapacağım? Bu sorular her yazıda, her raporda ve her portföy denemesinde yeniden sorulmalıdır. Kalıcı öğrenme biraz da bu sade disiplinin adıdır.",
      ],
    },
    {
      eyebrow: "Kalıcı İçerik",
      title: "Topluluk temelli öğrenme neden tek başına öğrenmeden daha güçlü olabilir?",
      paragraphs: [
        "Piyasayı takip etmek dışarıdan bakınca bireysel bir uğraş gibi görünür. İnsan ekranın başına geçer, fiyatlara bakar, haberleri okur ve kendi kararını verir. Bu taraf doğrudur; son karar her zaman kişiye aittir. Fakat öğrenmenin kendisi tek başına kalmak zorunda değildir. Hatta birçok durumda doğru topluluk, öğrenmeyi daha düzenli ve daha kalıcı hale getirir.",
        "Topluluk temelli öğrenme yaklaşımında bilgi yalnızca anlatılmaz; birlikte tartışılır, gerçek hayatla ilişkilendirilir ve düzenli geri bildirimle güçlenir. Eğitim literatüründe bu yaklaşımın öne çıkan tarafı, öğreneni pasif dinleyici olmaktan çıkarıp sürecin aktif parçası haline getirmesidir. Piyasa okuryazarlığı için bu yaklaşım çok değerlidir; çünkü piyasa bilgisi ancak soru sorulduğunda ve farklı senaryolarla sınandığında derinleşir.",
        "Tek başına öğrenen kişi çoğu zaman kendi kör noktasını fark etmekte zorlanır. Bir varlığa fazla bağlanabilir, sevdiği görüşü destekleyen haberleri seçebilir veya kısa vadeli sonucu doğru yöntem zannedebilir. Topluluk içinde ise başka bir üyenin sorusu bu ezberi bozabilir. “Bu kararı hangi gerekçeyle aldın?” sorusu bazen en iyi eğitim aracıdır.",
        "Rotary gibi güven ilişkisi olan yapılarda bu etki daha da güçlüdür. Çünkü insanlar sadece sonuçlarını değil, düşünme biçimlerini de paylaşabilir. Bir üye altını neden güvenli liman olarak gördüğünü anlatır, başka biri teknoloji hisselerinde neden temkinli olduğunu söyler, bir diğeri döviz tarafındaki beklentisini makro veriyle ilişkilendirir. Bu konuşmalar doğru zeminde yapıldığında kimseye emir vermez; herkesin düşüncesini keskinleştirir.",
        "Burada dikkat edilmesi gereken önemli bir sınır vardır. Topluluk, yatırım tavsiyesi verilen bir yer haline gelmemelidir. Amaç birine ne alacağını söylemek değildir. Amaç, kişinin kendi kararını daha iyi kurmasına yardımcı olmaktır. Bu nedenle Enbilir'in dili eğitim, değerlendirme ve kişisel görüş sınırında kalmalıdır. Her kullanıcı kendi riskinden, vadesinden ve kararından sorumludur.",
        "Topluluk öğrenmesinin bir başka faydası ritim oluşturmasıdır. İnsan tek başına başladığı birçok çalışmayı yarıda bırakabilir. Fakat haftalık lig, düzenli rapor, portföy karşılaştırması ve ortak değerlendirme olduğunda takip alışkanlığı güçlenir. Bu ritim, finansal okuryazarlığın en çok ihtiyaç duyduğu şeyi sağlar: süreklilik.",
        "Ayrıca topluluk başarıyı daha sağlıklı okumayı öğretir. Bir kişinin portföyü kısa vadede yükselmiş olabilir ama bu mutlaka iyi yöntem kullandığı anlamına gelmez. Başka bir kullanıcı kısa vadede geride kalmış olabilir ama riski daha doğru yönetmiş olabilir. Topluluk içinde bu ayrımı konuşmak, sadece kazananı alkışlamaktan daha öğreticidir.",
        "Enbilir'in lig, rozet, rapor ve sanal portföy yapısı bu nedenle yalnızca oyunlaştırma değildir. Doğru kullanıldığında bunlar öğrenmeyi görünür hale getiren araçlardır. Kullanıcı kendi gelişimini görür, başkasının yaklaşımından faydalanır ve aynı zamanda karar sorumluluğunu kendisinde tutar. Bana göre iyi topluluk tam olarak bunu yapar: kişiyi yönlendirmez, düşünmesini güçlendirir.",
        "Sonuç olarak topluluk temelli öğrenme tek başına öğrenmenin yerine geçmez; onu tamamlar. Piyasa kararları bireysel kalır, fakat öğrenme ortak bir zeminde daha hızlı olgunlaşır. İnsan bazen bir grafikten, bazen bir rapordan, bazen de yan masadaki sakin bir sorudan çok şey öğrenir. Bu yüzden Enbilir'de topluluk tarafını sadece rekabet olarak değil, düzenli ve güvenli bir öğrenme çevresi olarak görmek gerekir.",
      ],
    },
  ] as const;
}

function getContentCalendar(locale: string) {
  if (locale === "en") {
    return [
      {
        id: "monday-market-literacy",
        day: "Monday",
        theme: "Concept",
        title: "Weekly market-literacy article",
        body: "Start the week with one calm concept: financial statements, crypto, reserve currencies, precious metals, or investor behavior.",
        ctaHref: `/${locale}/blog?kategori=MACRO`,
        ctaLabel: "Read macro articles",
        practiceTitle: "Monday reading ritual",
        paragraphs: [
          "Monday is the day for opening the main idea of the week. The goal is not to predict the market immediately. The goal is to build a clean mental frame before prices, headlines, and social media noise start pushing the user into quick reactions.",
          "A Monday article should answer a simple question in plain language. What does a balance sheet show? Why does gold react to real interest rates? What is the difference between crypto money and digital money? Why do reserve currencies change over long historical cycles? One good question is enough for one week.",
          "The user should finish Monday with two or three sentences they can repeat in their own words. If they cannot explain the idea simply, they should not move too quickly to the virtual portfolio screen. Enbilir works best when the language is built before the decision.",
        ],
        checklist: [
          "Choose one article and write the main idea in your own words.",
          "Note one market example connected to the concept.",
          "Write one risk question before looking at prices.",
        ],
      },
      {
        id: "wednesday-mini-lesson",
        day: "Wednesday",
        theme: "Mini lesson",
        title: "Mini education lesson with visual support",
        body: "Turn the Monday concept into a smaller lesson with ratios, charts, signal explanations, and simple examples.",
        ctaHref: `/${locale}/egitim`,
        ctaLabel: "Open education",
        practiceTitle: "Wednesday simplification",
        paragraphs: [
          "Wednesday is the day for simplification. A concept that sounded broad on Monday should become visible through one table, one chart, one ratio, or one practical comparison.",
          "For example, if Monday discussed balance sheets, Wednesday can compare cash, debt, and equity with a small example. If Monday discussed crypto, Wednesday can compare Bitcoin, Ethereum, Solana, BNB, and LINK by purpose instead of price. If Monday discussed risk psychology, Wednesday can turn it into a checklist before placing a virtual trade.",
          "The purpose is to make the user say: I can now see where this idea appears on the platform. That is why Wednesday content should point toward education modules, the AI explanation boxes, and the trade reason note.",
        ],
        checklist: [
          "Convert the concept into one visible metric or example.",
          "Compare two assets or two behaviors using the same question.",
          "Prepare one sentence you would explain to another member.",
        ],
      },
      {
        id: "friday-portfolio-review",
        day: "Friday",
        theme: "Portfolio",
        title: "League and portfolio weekly summary",
        body: "Connect the week’s learning to virtual portfolio behavior: allocation, cash, risk, and decision notes.",
        ctaHref: `/${locale}/islem-yap`,
        ctaLabel: "Open virtual trading",
        practiceTitle: "Friday portfolio review",
        paragraphs: [
          "Friday is where reading turns into practice. The user should not only ask which asset moved. They should ask whether their own virtual portfolio reflects the idea they studied during the week.",
          "If the week was about balance sheets, the user may compare companies more carefully. If the week was about crypto infrastructure, they may avoid putting every coin into the same mental bucket. If the week was about precious metals, they may ask whether gold and silver are being used as risk balance or as a late emotional chase.",
          "This day should also use the decision note field. Before a virtual trade, the user writes why the trade makes sense, what time frame is being used, and what would prove the idea wrong. This small note turns a click into a learning record.",
        ],
        checklist: [
          "Review portfolio allocation before any new virtual trade.",
          "Write a decision note before acting.",
          "Compare the result with the week’s concept, not only with profit/loss.",
        ],
      },
      {
        id: "sunday-community-review",
        day: "Sunday",
        theme: "Community",
        title: "Leaders of the week and badge winners",
        body: "Close the week by reviewing leaderboard movement, league behavior, badges, and learning quality.",
        ctaHref: `/${locale}/liderlik-tablosu`,
        ctaLabel: "Open leaderboard",
        practiceTitle: "Sunday reflection",
        paragraphs: [
          "Sunday is not only a day to applaud the top number. It is the day to ask what kind of decisions produced the week’s movement. A user may rise because of one lucky concentration, while another may build a better process with balanced risk.",
          "Leaderboards, leagues, and badges should be read as learning signals. They help the community return to the platform, but the deeper value is in the conversation: Why did this portfolio behave well? Which risk was controlled? Which decision was lucky? Which decision was repeatable?",
          "A healthy Sunday review prepares the next Monday. The community closes the week with a few learning notes, then the next concept can begin with better questions.",
        ],
        checklist: [
          "Review top movers and ask what process created the result.",
          "Discuss one decision note inside your league or community.",
          "Choose the next week’s concept based on what confused users most.",
        ],
      },
    ] as const;
  }

  return [
    {
      id: "pazartesi-piyasa-okuryazarligi",
      day: "Pazartesi",
      theme: "Kavram",
      title: "Haftalık piyasa okuryazarlığı yazısı",
      body: "Haftaya tek bir ana fikirle başlanır: bilanço, kripto, rezerv para, değerli metaller, risk psikolojisi veya portföy disiplini.",
      ctaHref: `/${locale}/blog?kategori=MACRO`,
      ctaLabel: "Makro yazıları oku",
      practiceTitle: "Pazartesi okuma ritüeli",
      paragraphs: [
        "Pazartesi gününün görevi, haftanın ana kavramını sakin biçimde açmaktır. Bu günün amacı hemen işlem fikri üretmek değildir. Amaç, piyasa fiyatları, haberler ve sosyal medya yorumları kullanıcıyı acele ettirmeden önce doğru düşünme çerçevesini kurmaktır.",
        "Pazartesi yazısı tek bir güçlü soruya cevap vermelidir. Bilanço bize şirket hakkında ne söyler? Altın neden bazı dönemlerde güvenli liman gibi davranır? Kripto para ile dijital para neden aynı şey değildir? Doların rezerv para konumu tarih içinde nasıl okunmalıdır? Bir haftaya bir ana soru yeterlidir.",
        "Kullanıcı Pazartesi yazısını bitirdiğinde kendi cümlesiyle iki veya üç not çıkarabilmelidir. Eğer kavramı sade anlatamıyorsa, sanal portföyde karar vermek için acele etmemelidir. Enbilir'in mantığı burada başlar: önce dili kur, sonra kararı dene.",
        "Bu bölümde Dr. Hakan Ünsal'ın üslubu özellikle sakin kalmalıdır. Kullanıcıya bir varlığı almasını veya satmasını söylemek yerine, hangi soruları sorması gerektiğini göstermelidir. Pazartesi yazısı haftanın pusulasıdır; yön verir ama kullanıcı adına yürümemelidir.",
      ],
      checklist: [
        "Bir yazı seç ve ana fikri kendi cümlenle yaz.",
        "Bu kavramla ilgili piyasadan bir örnek belirle.",
        "Fiyatlara bakmadan önce bir risk sorusu yaz.",
      ],
    },
    {
      id: "carsamba-mini-egitim",
      day: "Çarşamba",
      theme: "Mini ders",
      title: "Görsel destekli mini eğitim dersi",
      body: "Pazartesi açılan kavram; oran, grafik, tablo, sinyal açıklaması veya sade örnekle görünür hale getirilir.",
      ctaHref: `/${locale}/egitim`,
      ctaLabel: "Eğitim bölümünü aç",
      practiceTitle: "Çarşamba sadeleştirme görevi",
      paragraphs: [
        "Çarşamba gününün görevi sadeleştirmektir. Pazartesi geniş anlatılan kavram, Çarşamba günü bir oran, bir tablo, bir grafik, bir karşılaştırma veya kısa bir örnek üzerinden görünür hale gelmelidir. Çünkü finansal okuryazarlık, yalnızca okumakla değil, kavramı somutlaştırmakla güçlenir.",
        "Örneğin Pazartesi bilanço anlatıldıysa, Çarşamba günü nakit, borç ve özkaynak ilişkisi küçük bir örnekle gösterilebilir. Pazartesi kripto varlıkların mantığı anlatıldıysa, Çarşamba günü Bitcoin, Ethereum, Solana, BNB ve LINK fiyatına göre değil, çözmeye çalıştıkları probleme göre karşılaştırılabilir.",
        "Risk psikolojisi haftasında Çarşamba içeriği, sanal işlem öncesi sorulacak üç soruya dönüşebilir: Bu işlemi neden yapıyorum? Hangi vadede düşünüyorum? Hangi durumda yanıldığımı kabul ederim? Böylece kavram doğrudan platform davranışına bağlanır.",
        "Bu günün sonunda kullanıcı şunu söylemelidir: Bu kavramı Enbilir içinde nerede göreceğimi anladım. Eğitim sayfası, AI açıklamaları, sanal işlem gerekçesi ve portföy paneli aynı öğrenme zincirinin parçaları haline gelir.",
      ],
      checklist: [
        "Haftanın kavramını bir oran, grafik veya örneğe indir.",
        "İki varlığı veya iki davranışı aynı soruyla karşılaştır.",
        "Bu konuyu başka bir üyeye nasıl anlatacağını tek cümleyle yaz.",
      ],
    },
    {
      id: "cuma-portfoy-ozeti",
      day: "Cuma",
      theme: "Portföy",
      title: "Haftanın lig ve portföy özeti",
      body: "Haftanın öğrenmesi sanal portföy davranışına bağlanır: dağılım, nakit, risk, gerekçe ve karar kalitesi birlikte okunur.",
      ctaHref: `/${locale}/islem-yap`,
      ctaLabel: "Sanal işlem sayfasını aç",
      practiceTitle: "Cuma portföy değerlendirmesi",
      paragraphs: [
        "Cuma günü, okunan bilginin sanal portföyde nasıl davrandığına bakma günüdür. Kullanıcı yalnızca hangi varlığın yükseldiğini veya düştüğünü sormamalıdır. Daha önemli soru şudur: Bu haftanın kavramı benim sanal portföyümde nasıl göründü?",
        "Hafta bilanço üzerineyse kullanıcı şirketleri daha dikkatli ayırmayı deneyebilir. Hafta kripto altyapısı üzerineyse her coin'i aynı sepete koymamayı öğrenebilir. Hafta değerli metaller üzerineyse altın ve gümüşü sadece yükseliyor diye değil, portföyde risk dengeleme rolüyle okuyabilir.",
        "Cuma'nın en önemli aracı işlem gerekçesidir. Kullanıcı sanal işlem yapmadan önce nedenini yazmalıdır. Gerekçenin mükemmel olması gerekmez. Önemli olan kararın görünür hale gelmesidir. Çünkü yazılmayan karar sonradan kolayca unutulur veya yanlış hatırlanır.",
        "Bu günün özeti kar veya zarar tablosu değildir. Cuma özeti karar kalitesi tablosudur. Kullanıcı pozisyon büyüklüğünü, nakit payını, tek varlığa yüklenip yüklenmediğini, AI sinyalini nasıl okuduğunu ve ters senaryosunu birlikte değerlendirmelidir.",
      ],
      checklist: [
        "Yeni sanal işlemden önce portföy dağılımına bak.",
        "İşlem gerekçesini ve ters senaryonu yaz.",
        "Sonucu yalnız kar/zararla değil, haftanın kavramıyla karşılaştır.",
      ],
    },
    {
      id: "pazar-topluluk-degerlendirmesi",
      day: "Pazar",
      theme: "Topluluk",
      title: "Haftanın liderleri ve rozet kazananlar",
      body: "Hafta liderlik, ligler, rozetler ve topluluk konuşmalarıyla kapanır; amaç sadece derece değil, öğrenme kalitesidir.",
      ctaHref: `/${locale}/liderlik-tablosu`,
      ctaLabel: "Liderlik tablosunu aç",
      practiceTitle: "Pazar değerlendirme soruları",
      paragraphs: [
        "Pazar günü yalnızca en yüksek portföy değerini alkışlama günü değildir. Bu gün, haftanın kararlarının nasıl alındığını konuşma günüdür. Bir kullanıcı tek bir cesur hamleyle öne çıkmış olabilir; başka bir kullanıcı daha dengeli ve sürdürülebilir bir süreç kurmuş olabilir. İkisi aynı şey değildir.",
        "Liderlik, ligler ve rozetler öğrenme sinyali gibi okunmalıdır. Sıralama kullanıcıyı platforma geri getirir, ama asıl değer topluluk konuşmasında oluşur. Bu portföy neden iyi davrandı? Hangi risk kontrol edildi? Hangi karar şanstı? Hangi karar tekrar edilebilir bir sürece dayanıyordu?",
        "Pazar değerlendirmesinde yatırım tavsiyesi verilmez. Kimseye ne alacağı veya satacağı söylenmez. Bunun yerine karar dili konuşulur. “Bu kararı hangi gerekçeyle aldın?” ve “Yanılsaydın ne yapardın?” soruları, haftanın en değerli eğitim sorularıdır.",
        "Sağlıklı bir Pazar kapanışı, sonraki Pazartesi'nin konusunu da hazırlar. Topluluk hafta içinde en çok nerede zorlandıysa, yeni haftanın yazısı oradan başlayabilir. Böylece blog, eğitim, sanal portföy ve topluluk birbirini besleyen yaşayan bir sistem haline gelir.",
      ],
      checklist: [
        "Liderlikte ilk sıralara değil, karar sürecine bak.",
        "Ligde bir işlem gerekçesini eğitim amacıyla tartış.",
        "Gelecek haftanın konusunu en çok karışan soruya göre seç.",
      ],
    },
  ] as const;
}

function getStarterPosts(locale: string) {
  if (locale === "en") {
    return [
      {
        tag: "Weekly literacy",
        title: "What is a virtual portfolio?",
        excerpt: "Explain why simulation-based investing helps people build language and confidence before facing real-money decisions.",
        keywords: ["virtual portfolio", "financial literacy", "market learning"],
      },
      {
        tag: "Risk management",
        title: "How is risk management learned?",
        excerpt: "Show that risk is not fear; it is the discipline of position size, patience, and scenario thinking.",
        keywords: ["risk management", "portfolio discipline", "beginner investing"],
      },
      {
        tag: "Indicators",
        title: "RSI, MACD, and trend for beginners",
        excerpt: "Turn technical indicators into simple language so new users can compare momentum, direction, and caution.",
        keywords: ["RSI", "MACD", "trend analysis"],
      },
      {
        tag: "Community",
        title: "How do Rotary leagues work?",
        excerpt: "Describe how communities can create their own invite-based competition rhythm around education and shared review.",
        keywords: ["Rotary league", "community competition", "virtual trading"],
      },
    ] as const;
  }

  return [
    {
      tag: "Haftalık okuryazarlık",
      title: "Sanal portföy nedir?",
      excerpt: "Simülasyon temelli yatırım deneyiminin, kullanıcıya gerçek para baskısı olmadan dil ve güven kazandırdığını anlatır.",
      keywords: ["sanal portföy", "finansal okuryazarlık", "piyasa eğitimi"],
    },
    {
      tag: "Risk yönetimi",
      title: "Risk yönetimi nasıl öğrenilir?",
      excerpt: "Riski korku değil; pozisyon boyutu, sabır ve senaryo düşüncesi disiplini olarak açıklar.",
      keywords: ["risk yönetimi", "portföy disiplini", "yeni başlayan yatırım"],
    },
    {
      tag: "Göstergeler",
      title: "Yeni başlayanlar için RSI, MACD ve trend",
      excerpt: "Teknik göstergeleri sade bir dille anlatarak momentum, yön ve temkin ihtiyacını ayırt etmeyi kolaylaştırır.",
      keywords: ["RSI", "MACD", "trend analizi"],
    },
    {
      tag: "Topluluk",
      title: "Rotary ligleri nasıl çalışır?",
      excerpt: "Toplulukların eğitim ve ortak değerlendirme etrafında kendi davetli yarışma ritmini nasıl kurabileceğini gösterir.",
      keywords: ["Rotary ligi", "topluluk yarışması", "sanal işlem"],
    },
  ] as const;
}
