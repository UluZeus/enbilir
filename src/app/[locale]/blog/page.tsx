import { PageHeader } from "@/components/PageHeader";
import { ManagedContentList } from "@/components/ManagedContentList";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getManagedContentItems } from "@/lib/managed-content";

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).simplePages.blog;
  const posts = await getManagedContentItems({ type: "BLOG", locale });
  const editorialPillars = posts.length > 0 ? getManagedPostHighlights(posts) : getEditorialPillars(locale);
  const starterPosts = getStarterPosts(locale);
  const contentCalendar = getContentCalendar(locale);
  const evergreenNotes = getEvergreenNotes(locale);

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} locale={locale} />
      <section className="grid gap-4 md:grid-cols-3">
        {editorialPillars.map((pillar) => (
          <article key={pillar.title} className="premium-card premium-card--interactive p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{pillar.eyebrow}</p>
            <h2 className="mt-2 text-xl font-black text-[#152033]">{pillar.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{pillar.body}</p>
          </article>
        ))}
      </section>
      <section className="premium-card premium-card--interactive p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
          {locale === "tr" ? "Haftalık içerik takvimi" : "Weekly content calendar"}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {contentCalendar.map((item) => (
            <div key={item.day} className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
              <p className="text-sm font-black text-[#152033]">{item.day}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
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
          items={posts}
          emptyTitle={copy.emptyTitle}
          emptyBody={copy.emptyBody}
          featuredLabel={locale === "en" ? "Featured" : "Öne çıkan"}
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

function firstParagraph(body: string) {
  return body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).find(Boolean) ?? body;
}

function getManagedPostHighlights(posts: Awaited<ReturnType<typeof getManagedContentItems>>) {
  return posts.slice(0, 3).map((post) => ({
    eyebrow: post.isFeatured ? "Öne çıkan yazı" : "Enbilir yazısı",
    title: post.title,
    body: post.excerpt ?? firstParagraph(post.body),
  }));
}

function getEvergreenNotes(locale: string) {
  if (locale === "en") {
    return [
      {
        eyebrow: "Evergreen",
        title: "Why does financial literacy need repetition?",
        paragraphs: [
          "Financial literacy is not built by reading one article once. It grows when users see the same concepts in different formats: article, visual card, portfolio action, league discussion, and AI summary.",
          "That is why content on Enbilir should not feel isolated. A blog post should feed an education card, an education card should support a league discussion, and that discussion should bring the user back to the portfolio screen.",
        ],
      },
      {
        eyebrow: "Evergreen",
        title: "Why can community-based learning outperform solo learning?",
        paragraphs: [
          "People tend to stay more consistent when there is a visible group rhythm around them. Community-based learning adds accountability, reflection, and motivation without needing real-money pressure.",
          "For Rotary-oriented groups, this is especially powerful because the platform becomes not only a personal tool but also a recurring meeting topic and a shared learning environment.",
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
      { day: "Monday", body: "Weekly market-literacy article" },
      { day: "Wednesday", body: "Mini education lesson with visual support" },
      { day: "Friday", body: "League and portfolio weekly summary" },
      { day: "Sunday", body: "Leaders of the week and badge winners" },
    ] as const;
  }

  return [
    { day: "Pazartesi", body: "Haftalık piyasa okuryazarlığı yazısı" },
    { day: "Çarşamba", body: "Görsel destekli mini eğitim dersi" },
    { day: "Cuma", body: "Haftanın lig ve portföy özeti" },
    { day: "Pazar", body: "Haftanın liderleri ve rozet kazananlar" },
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

function getEditorialPillars(locale: string) {
  if (locale === "en") {
    return [
      {
        eyebrow: "Editorial 1",
        title: "Market literacy notes",
        body: "Explain concepts, indicators, and decision habits with a practical tone that helps members act, not just read.",
      },
      {
        eyebrow: "Editorial 2",
        title: "Community stories",
        body: "Highlight how Rotary leagues use the platform, what they learn, and how engagement grows over time.",
      },
      {
        eyebrow: "Editorial 3",
        title: "Platform updates",
        body: "Use the blog to announce new features, training series, and upcoming competition cycles with a clear CTA.",
      },
    ] as const;
  }

  return [
    {
      eyebrow: "Piyasa okuması",
      title: "Önce sakin kalmak, sonra karar vermek",
      body: "Kavramları, göstergeleri ve karar alışkanlıklarını yalnızca anlatan değil, günlük kullanıma indiren bir dille ele alır.",
    },
    {
      eyebrow: "Topluluk ritmi",
      title: "Birlikte öğrenmenin piyasadaki karşılığı",
      body: "Rotary liglerinde oluşan öğrenme düzenini, kullanıcıların birbirinden nasıl beslendiğini ve katılımın neden büyüdüğünü görünür kılar.",
    },
    {
      eyebrow: "Platform notları",
      title: "Yeni özellikler ne işe yarıyor?",
      body: "Eğitim serilerini, yarışma dönemlerini ve platform yeniliklerini sade bir çağrıyla duyurur; kullanıcının nereden başlayacağını netleştirir.",
    },
  ] as const;
}
