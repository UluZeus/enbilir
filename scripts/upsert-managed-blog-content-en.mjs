import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function readEnvFile() {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      }),
  );
}

function getDatabasePath() {
  const env = { ...readEnvFile(), ...process.env };
  const databaseUrl = env.DATABASE_URL ?? "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Only SQLite file DATABASE_URL values are supported by this script. Received: ${databaseUrl}`);
  }

  const filePath = databaseUrl.replace(/^file:/, "");
  return path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
}

const posts = [
  {
    id: "managed-bilanco-okuma-teknikleri-en",
    title: "Reading a Balance Sheet with Examples: Where Should You Look First?",
    excerpt: "Balance-sheet reading is not memorization. When assets, debt, equity, cash, and inventory are read together, the company story becomes much clearer.",
    sortOrder: 420,
    body: `A balance sheet is the financial photograph of a company at a specific date. It shows what the company owns, how much it owes, and how much belongs to shareholders. When I begin reading a balance sheet, I do not start with the most complicated line items. I first look at three big headings: assets, liabilities, and equity.

The basic formula is simple: assets equal liabilities plus equity. If a company has 100 units of assets and 60 units are financed by debt, then 40 units are equity. This tells us how much leverage the company uses. Debt is not automatically bad, but it must be compatible with the company's cash-generating power.

Imagine two companies. The first has 1 billion TL in assets, 300 million TL in debt, and 700 million TL in equity. The second also has 1 billion TL in assets, but 850 million TL in debt. Their asset size looks the same, but their risk profile is very different. The second company is more sensitive to interest rates, exchange rates, and sales volatility.

Current assets and short-term liabilities should also be read together. Current assets include cash, trade receivables, and inventory expected to turn into cash within a year. Short-term liabilities are obligations that must be paid soon. If short-term debt is growing much faster than current assets, the reader should slow down and ask why.

Inventory is another important line. Rising inventory may mean growth preparation, but it may also mean unsold goods. To understand the difference, the balance sheet must be read with the income statement. If sales are rising and inventory grows moderately, the pattern may be natural. If sales are weak while inventory grows rapidly, working-capital pressure may be building.

Trade receivables follow the same logic. A company may sell products but collect cash late. Profit may appear on paper, while cash does not arrive on time. That is why balance-sheet reading is not only about large numbers; it is about how the line items speak to each other.

Equity shows how much resource the company has accumulated inside itself. Retained earnings and current-period profit reveal whether the business can strengthen its own capital base. A company that keeps losing money can see its equity erode over time, which affects borrowing capacity and investment power.

A balance sheet alone should not decide anything. It should be read with the income statement and the cash-flow statement. If the balance sheet is the photograph, the income statement is the film strip, and the cash-flow statement is the real money moving in and out of the cash register.

The purpose of this article is not to say buy or sell any company. The purpose is to help the reader interpret market news more calmly. A rising share price does not automatically mean a strong financial structure; first look at the balance sheet, debt, cash, and working capital.`,
  },
  {
    id: "managed-finansci-olmayanlar-finansal-tablo-en",
    title: "A Simple Guide to Financial Statements for Non-Finance People",
    excerpt: "Financial statements do not have to be intimidating. Reduce the three statements to three questions: What does the company have, what did it earn, and what cash came in?",
    sortOrder: 410,
    body: `For people who are not finance professionals, financial statements may look tiring at first. Lines, notes, ratios, and technical words can push the reader away. But the first task is not to solve the whole report at once. It is enough to begin with three main questions.

The first question is: What does the company own and how much does it owe? The answer is in the balance sheet. Buildings, machinery, cash, inventory, and receivables appear on the asset side. Bank loans, supplier debt, and other obligations appear on the liability side.

The second question is: How much did the company sell, and how much profit was left? The answer is in the income statement. It begins with revenue, subtracts costs and expenses, and arrives at profit or loss. The reader should not look only at the last line. Gross profit, operating profit, and net profit should be compared with each other.

The third question is: Did the paper profit really turn into cash? The answer is in the cash-flow statement. A company may report profit but fail to collect cash on time. Another company may show modest profit while operating cash flow remains strong. This distinction is very important.

Consider a company with 100 million TL in sales and 10 million TL in net profit. That may look good. But if trade receivables rise sharply and operating cash flow is negative, the quality of that profit should be questioned. A healthy business should eventually convert sales into cash.

For a beginner, ratios should be used as simple warning lights rather than magic formulas. Current ratio gives a clue about short-term liquidity. Debt-to-equity shows leverage. Gross margin shows how much room remains after production or purchase costs. Net margin shows how much is left after all expenses.

Trends are often more useful than one-year numbers. Is debt rising every year? Is cash shrinking? Are receivables growing faster than sales? Is profit increasing while cash flow weakens? These questions reveal the quality of the story.

Financial statements should also be connected to the business model. A supermarket, a bank, a software company, and a manufacturing company will not have the same balance-sheet structure. The reader should avoid judging every company with one rigid rule.

The healthiest beginner method is to write a short paragraph after reading the statements: This company owns these assets, carries this level of debt, earns money from this activity, and converts profit into cash at this quality. If the reader can write that paragraph, financial literacy has begun.

This is not investment advice. It is a practical reading method. The goal is to make the user more independent when reading company news, earnings announcements, and market commentary.`,
  },
  {
    id: "managed-kripto-piyasasi-temel-kavramlar-en",
    title: "A Calm Introduction to Crypto: What Are Bitcoin, Ethereum, Solana, BNB, and LINK?",
    excerpt: "Crypto assets should not be reduced to price movement alone. Each network tries to solve a different problem and carries different risks.",
    sortOrder: 400,
    body: `The crypto market is often presented as a place of fast price movements. Prices rise, fall, and dominate the conversation. But financial literacy requires looking beyond price. A crypto asset should be understood by asking what problem it tries to solve, how the network works, who uses it, and what risks it carries.

Bitcoin is the best-known crypto asset. Its central idea is a limited-supply digital asset that can be transferred without a central issuer. Supporters see it as a digital scarcity system. Critics point to volatility, energy use, regulatory uncertainty, and the fact that price can move far more sharply than traditional currencies.

Ethereum is different. It is not only a transfer network; it is a programmable blockchain. Smart contracts, decentralized applications, tokens, and many DeFi structures have been built around Ethereum. That broader use case is powerful, but it also brings technical complexity, competition, and regulatory questions.

Solana focuses on speed and low transaction cost. It is often discussed in relation to high-throughput applications, DeFi, NFTs, and consumer-oriented blockchain use. Its advantage is performance; its risk is that a fast network still needs reliability, developer trust, and sustainable usage.

BNB is connected to the Binance ecosystem. It is used across exchange-related and blockchain-related services. Because of that ecosystem link, BNB should be read not only as a token but also through platform dependency, regulatory pressure, and the health of the surrounding infrastructure.

LINK, the token of Chainlink, is tied to the oracle problem. Blockchains need reliable external data in order to run many smart contracts. Chainlink aims to bring off-chain data into blockchain systems. Its logic is different from a payment coin; it is closer to infrastructure.

The important point is this: Bitcoin, Ethereum, Solana, BNB, and LINK are not the same thing simply because all are traded in crypto markets. They differ by purpose, network design, usage area, and risk. Putting every coin in one mental bucket is one of the most common beginner mistakes.

Crypto also carries risks that users must understand. Volatility can be extreme. Private-key mistakes may be irreversible. Some projects may fail technically or economically. Regulation can change the market quickly. Liquidity may disappear in smaller assets.

In Enbilir, crypto should be studied as market literacy, not as excitement chasing. A user can compare networks, test virtual allocations, and observe how crypto exposure changes portfolio risk. That is more valuable than simply asking which coin will rise.`,
  },
  {
    id: "managed-kripto-para-dijital-para-farki-en",
    title: "Crypto Money and Digital Money Are Not the Same Thing",
    excerpt: "Every crypto asset is digital, but not every digital form of money is crypto. Understanding the difference makes future money debates clearer.",
    sortOrder: 390,
    body: `Crypto money and digital money are often used as if they mean the same thing. They do not. Every crypto asset exists digitally, but every digital balance is not a crypto asset. The money visible in a bank account may be digital, but that does not make it crypto.

Digital money is the broader concept. A bank balance, card payment, mobile transfer, or future central-bank digital currency can be considered digital money. These systems usually involve banks, payment institutions, central authorities, and regulators.

Crypto assets usually work on blockchain or similar distributed-ledger systems. Transactions are verified by a network, cryptography is used, and in some systems there is no central issuer. Bitcoin is the best-known example. Ethereum and Solana add programmable applications to the transfer function.

Centralized digital money has advantages: regulation, consumer protection, reversibility in some cases, and compatibility with the existing financial system. Its disadvantage is reliance on central institutions. Accounts may be frozen, transfers may be blocked, and monetary policy is controlled by an authority.

Crypto assets have different advantages: open networks, cross-border access, programmability, and in some cases a claim of censorship resistance. Their disadvantages include volatility, technical complexity, fraud risk, private-key loss, regulatory uncertainty, and the fact that user mistakes are often irreversible.

Central-bank digital currencies are another category. They are not private crypto tokens; they are digital forms of central-bank money. Their aim may be to modernize payment systems, reduce costs, or create new monetary infrastructure.

Stablecoins sit in the middle of this discussion. Some stablecoins try to hold a value close to the dollar or another asset. They may offer a more stable unit inside crypto infrastructure, but reserve quality, issuer risk, audits, and regulation matter greatly.

I find this distinction important because risk becomes confused when concepts are confused. Bank digital money, decentralized crypto assets, central-bank digital currencies, stablecoins, and tokens can be discussed at the same table, but they should not be placed in the same box.`,
  },
  {
    id: "managed-borsalara-yatirimda-dikkat-en",
    title: "Key Points to Watch When Trading in Stock and Crypto Markets",
    excerpt: "Markets create opportunities, but also mistakes. Time horizon, position size, liquidity, leverage, news, and psychology must be read together.",
    sortOrder: 380,
    body: `One of the most dangerous sentences in markets is: Everyone is buying, so I should buy too. The crowd may sometimes be right, but that does not remove your own risk. Before entering any market, the user must first define their own framework.

The first point is time horizon. Are you thinking short term, medium term, or long term? An asset may look expensive in the short term while its long-term story remains strong. The reverse is also possible. If the horizon is unclear, every price movement changes the user's mind.

The second point is position size. How much of the portfolio is attached to one idea is as important as the idea itself. Putting the entire portfolio into an asset that looks attractive means ignoring the possibility of being wrong. Markets often punish that kind of confidence.

The third point is liquidity. In small stocks or low-volume crypto assets, bid-ask spreads can be wide. The price shown on the screen may differ from the price at which a trade can actually be executed. If liquidity is weak, exiting can be as hard as entering.

The fourth point is leverage. Leverage can magnify profit, but it magnifies loss at the same speed. Beginners should not treat leveraged products as learning tools. Even if the market direction is right, timing mistakes can damage the portfolio.

The fifth point is news. A news item may be true but already priced in. A company may announce good earnings, but the share price may fall because expectations were even higher. A crypto project may announce progress, but profit-taking may follow. News and price behavior must be read together.

The sixth point is psychology. A user may want to take more risk after a loss, become overconfident after a gain, or chase a move because of fear of missing out. These behaviors are independent from technical knowledge and often become the real enemy of the portfolio.

For example, entering a coin only after it has risen sharply may mean buying momentum rather than understanding technology. Buying a stock only because it fell may confuse a lower price with better value. The reason for the move matters.

The Enbilir virtual portfolio is useful because users can see these mistakes without real-money risk. Overconcentration, running out of cash, chasing late moves, and revenge trading can be observed safely.

This is not investment advice. It is a basic reminder for healthier market behavior: first horizon, then risk, then reason, then action. When the order is broken, decision quality falls.`,
  },
  {
    id: "managed-rezerv-para-tarihi-dolar-en",
    title: "The Reserve Currency Was Not Always the Dollar: From Guilder to Sterling to Dollar",
    excerpt: "Reserve-currency leadership has changed in history. The dollar is still very strong, but every reserve system eventually enters a period of questioning.",
    sortOrder: 370,
    body: `Today the US dollar may look like the natural center of world trade, central-bank reserves, and financial markets. Oil is priced in dollars, many countries hold dollar reserves, and a large share of global borrowing is dollar-denominated. But history says one thing clearly: reserve-currency leadership is not eternal.

In the past, the Dutch guilder, Spanish silver coins, the French franc, and especially the British pound played major roles in global trade and finance. In the nineteenth century and early twentieth century, sterling was at the center of the financial system. London's financial power, Britain's trade network, and imperial reach gave sterling enormous influence.

Then the world changed. Wars, debt burdens, shifts in economic power, and the rise of the United States moved the dollar forward step by step. With Bretton Woods, the dollar became the central currency linked to gold. Even after the direct gold link ended in 1971, the dollar's global role continued because US markets remained deep and liquid.

The dollar is still the most important reserve currency by a wide margin. IMF and Federal Reserve data show that it remains the largest share of official reserves. But its share has declined from early-2000s peaks, and central banks have gradually given more room to the euro, yen, sterling, Canadian dollar, Australian dollar, renminbi, and gold.

This does not mean the dollar is finished. Reserve-currency transitions are slow. A reserve currency is not merely a unit of money; it is a combination of deep markets, trust, legal structure, military and political power, payment systems, and habit. Replacing the dollar is not easy.

But saying the dollar will remain unquestioned forever is also historically too comfortable. US debt dynamics, geopolitical tension, sanctions, alternative payment systems, central-bank gold buying, and China's long-term strategy are all making the dollar order more debated.

I prefer to read this not as a collapse prophecy, but as a historical cycle. Every reserve-currency era has a strong beginning, an institutional phase, a peak, and eventually a period of questioning. The dollar can still be strong and questioned at the same time.

The financial-literacy lesson is simple: no currency is sacred. It remains central as long as trust, power, institutions, and liquidity support it. When those supports weaken, the world slowly starts discussing alternatives.

Gold, digital money, crypto assets, central-bank reserve preferences, and regional payment agreements are all parts of this larger debate. A user following daily prices should keep this longer historical frame in mind.`,
  },
  {
    id: "managed-degerli-metaller-para-sistemi-en",
    title: "Why Are Gold, Silver, and Precious Metals Back on the Agenda?",
    excerpt: "Central-bank gold demand, trust debates around money, and geopolitical risk have made precious metals strategic again.",
    sortOrder: 360,
    body: `Gold and silver have never been only jewelry or commodities in financial history. For long periods, they stood at or near the center of the money system. Paper money and digital payments dominate daily life today, but the importance of precious metals has not disappeared.

Central-bank gold buying has attracted attention in recent years. There are several reasons. The first is reserve diversification. Central banks may not want to keep all reserves dependent on one currency or one financial system. The second is geopolitics. When sanctions, wars, and blocs become more visible, gold may look like a neutral reserve asset.

The third reason is inflation and trust in money. When money supply, budget deficits, and debt levels are debated, investors and central banks return to assets with a long memory of preserving purchasing power. Gold has that historical memory.

Gold's advantage is that it carries no counterparty risk when physically held. A bond is someone else's promise to pay. A bank deposit depends on the banking system. Gold, in physical form, is not another party's liability. That feature matters in periods of stress.

Silver has a different profile. It is both a precious metal and an industrial input. Solar panels, electronics, and other industrial uses mean silver is not only a monetary asset. Because of that, silver can be more volatile than gold.

Precious-metal prices do not rise only because of fear. Real interest rates, dollar strength, central-bank policy, geopolitical risk, fund flows, and physical demand all matter. A strong dollar can pressure gold, but extreme geopolitical risk can weaken that relationship.

Will gold replace money again? That is not a simple yes-or-no question. The transaction volume, credit system, and digital infrastructure of modern economies do not easily fit a classic gold standard. But gold's weight inside the reserve system can rise, and its role as a trust asset can become more visible.

For users, the key is not to treat precious metals as a one-way story. Gold may be a long-term trust asset and still fall sharply in the short term. Silver may benefit from industrial demand and still remain highly volatile. Mining companies carry operational risks that differ from metal prices.

On Enbilir, precious metals should be read through macro reports, technical view, and portfolio allocation together. Gold or silver can act as risk-balancing tools, but they do not have the same meaning at every price. The rule remains the same: do not memorize the story; read the context.`,
  },
  {
    id: "managed-finansal-kararlarda-psikoloji-en",
    title: "In Financial Decisions, the Hardest Opponent Is Not the Market but Our Own Behavior",
    excerpt: "Fear of missing out, revenge trading, overconfidence, and crowd behavior form the behavioral side of financial literacy.",
    sortOrder: 350,
    body: `In markets, everyone talks about charts, news, and data. These are important. But very often the biggest problem is not lack of data; it is lack of behavioral discipline. A person may see the right information and still act at the wrong time, with the wrong size, and under the wrong emotion.

Fear of missing out is one of the most common mistakes. An asset rises quickly, everyone starts talking about it, and the user feels late. They enter without a plan. At that point the decision is based on fear, not analysis. Even if it works once, it can create a bad habit.

Revenge trading is another dangerous behavior. A user loses money and wants to recover it immediately. They open a larger position, choose a riskier asset, or break their time horizon. After a loss, the first task should not be more risk; it should be reviewing the decision process.

Overconfidence is a quiet risk. After a few correct decisions, the user may believe the market has confirmed their ability. Position size grows, risk warnings are ignored, and no negative scenario is written. Markets often teach the hardest lesson when a person feels most comfortable.

Crowd behavior has become stronger in the social-media era. If many people say the same thing, it can feel true. But the crowd often forms late in a price move. The asset everyone is discussing may be where risk has become least visible.

The solution is not self-blame; it is building a system. Writing a reason before each trade, limiting position size, tracking cash, creating a waiting rule after losses, and reviewing decisions later are all parts of that system.

A virtual portfolio is valuable here. Users can see their own patterns without losing real money. Do they always chase what has already risen? Do they panic during declines? Do they attach too much to one asset? Do they forget cash? Learning begins when these patterns become visible.

Financial literacy is not only balance sheets, charts, and macro data. It is also knowing your own psychology. Markets change every day, but human weaknesses change much more slowly. Good market education must include behavior education.

Enbilir's virtual portfolio, league structure, and AI reports can make these behaviors visible. When users evaluate their own decisions, community rhythm, and AI context together, they can build a calmer decision language.`,
  },
  {
    id: "managed-portfoy-gunlugu-tutmak-en",
    title: "Keeping a Portfolio Journal: Write One Sentence Before Every Trade",
    excerpt: "Writing the reason for a decision makes review easier and moves the user from momentary excitement toward disciplined learning.",
    sortOrder: 340,
    body: `I suggest a simple but powerful habit to anyone who wants to learn markets: write one sentence before every trade. Why am I buying or selling this asset? What time frame am I using? What would prove me wrong? A trade without these answers often remains scattered.

Keeping a portfolio journal is not about sounding professional; it is about knowing yourself. People remember their decision differently after the result. If they win, they may make the process look better than it was. If they lose, they may blame the market too easily. A written note reduces this distortion.

A simple journal needs five pieces of information: date, asset, direction, reason, and invalidation scenario. For example: I am buying gold because the dollar is weakening while geopolitical risk is rising; I would be wrong if real yields rise again. The sentence does not have to be perfect. It only has to make the thinking visible.

A crypto example could be: I am watching Ethereum because network activity and market interest are improving, but I will not increase exposure if general risk appetite weakens. That note shows conditional thinking rather than pure excitement.

The portfolio journal is especially useful in a virtual portfolio. The user can test decision reasons without real-money pressure. A week later, they can ask: Was my reason correct? If not, where did I make the mistake? Was the result good but the method weak? Was the result poor but the process reasonable?

This distinction is crucial. A good result is not always a good decision. A bad result is not always a bad decision. Markets allow luck in the short term. A journal helps the user separate outcome from process.

Inside a community, the journal becomes even more valuable. Users can ask each other why they thought that way instead of simply asking what they bought. That question does not create investment advice; it creates learning. In trusted communities, this approach builds a healthy discussion culture.

Enbilir can make this habit more visible over time through decision notes, weekly portfolio reviews, and AI-assisted summaries. In my view, one of the most valuable parts of financial literacy is this: write your decision, then return to it honestly.`,
  },
  {
    id: "managed-home-market-calm-decision-en",
    title: "Starting to Read Markets: First Stay Calm",
    excerpt: "The first need in markets is not more indicators, but the habit of asking the right question. Enbilir was built to make that habit practical and measurable.",
    sortOrder: 300,
    body: `Market literacy is not about putting more lines on a screen. Charts, RSI, MACD, trend lines, volume, and support-resistance areas are useful. But none of them can produce a good decision if the user does not know what question they are trying to answer. First, stay calm. Then define the question.

When looking at an asset, the first question should be: Is this movement truly strong, or is it only a short burst of excitement? Without that question, many trades become a person's impatience disguised as market interpretation. This is why the virtual portfolio approach in Enbilir matters.

Beginners often give too much weight to the latest price movement. They think they missed what has risen and see opportunity in what has fallen. But good market reading looks not only at where price went, but also at how it got there. Did volume confirm the move? Did news support it? What is the broader risk mood?

The aim here is not to tell anyone to buy or sell. The aim is to help the user think more regularly before making their own decision. Time horizon, risk level, target, and negative scenario should be written before action. Without these, the user is not making a plan; they are making a guess.

Market language can look complicated, but its basic logic is simple when explained well. Trend shows direction. Volume gives a clue about the seriousness of that direction. RSI may show whether a move is stretched. MACD warns about momentum changes. None of them is a decision alone; together they create meaning.

What matters to me is not that users memorize indicators, but that they can explain them in their own words. If a user can say, this asset is rising but volume is weak and risk appetite is low, literacy has begun.

A virtual portfolio creates a behavior archive. Where did the user rush? Where did they wait? Which headline did they overreact to? Which indicator misled them? Learning markets is also learning oneself.

That is why reports, leagues, and portfolio screens should not be seen as disconnected pieces. Reports give the market picture. Leagues create community rhythm. The portfolio screen records the user's decision path. Education content strengthens the language behind those decisions.

There is new market news every day: oil, gold, technology shares, interest-rate expectations, crypto, currencies. Not every headline deserves the same weight. The important skill is to understand how much of the news is already priced and which asset groups it affects.

The common mistake is to think a correct result means a good decision. In the short term, a weak method can still produce a good outcome. Enbilir therefore cares not only about the result, but also about how the decision was made.

Every text on this platform has the same purpose: help the market follower think more independently, define risk more clearly, and avoid being dragged by the excitement of the crowd. That begins with staying calm and knowing what you are looking at.`,
  },
  {
    id: "managed-home-virtual-portfolio-serious-en",
    title: "Why Should a Virtual Portfolio Be Taken Seriously?",
    excerpt: "A virtual portfolio may look like a game, but used correctly it becomes a valuable mirror of risk understanding, patience, and decision discipline.",
    sortOrder: 290,
    body: `At first glance, a virtual portfolio may look like a simple practice area. But a well-designed virtual portfolio is a serious education tool because it reveals how a user behaves toward the market. Before trading with real money, a person needs to understand themselves.

A large part of financial literacy is behavior, not information. A person may know what an asset is, learn indicators, and follow news. But if discipline breaks at the decision moment, information alone is not enough. A virtual portfolio makes the behavior side visible.

Enbilir places virtual money at the center of a realistic decision environment. When a user chooses between gold, silver, FX, stock indices, technology shares, energy, or crypto assets, they are actually building a priority order. Over time, that order reveals the user's market character.

If a user keeps returning to the same asset, the reason should be examined. Do they really understand that area, or does it only feel familiar? If they trade constantly, is it curiosity or impatience? A virtual portfolio creates a safe place to ask these questions.

The important thing is not success in one trade. The important thing is making decisions more consistent over time. Taking too much risk one week and withdrawing completely the next week often reflects emotion more than market knowledge. Education can improve that.

Virtual portfolios are also useful inside a community. People do not only see their own results; they see different decision styles. One user may be cautious, another aggressive. If managed well, these differences produce learning rather than judgment.

The league system creates motivation, but it should not be seen only as a race for first place. The deeper value is tracking personal progress. What did I change this week? Which mistake did I avoid repeating? When these questions are visible, the virtual portfolio becomes a learning notebook.

Risk perception is one of the hardest topics in market literacy. Risk is not only the possibility of losing. It is knowing how much you are risking, under what condition you will exit, and what you will do if you are wrong. A virtual portfolio lets users explore those questions without financial damage.

The platform's reports do not replace the user's decision. If a macro report says the dollar is strengthening, should everyone make the same choice? No. Time horizon, risk appetite, and current allocation differ. The report informs; the decision remains with the user.

Used seriously, a virtual portfolio turns a person from a passive market watcher into someone who sees their own decisions, mistakes, and improvement. That is one of Enbilir's strongest qualities.`,
  },
  {
    id: "managed-home-community-learning-en",
    title: "Learning with a Community: Not Being Alone in Markets",
    excerpt: "Market tracking may look individual, but the right community makes learning more regular, durable, and enjoyable.",
    sortOrder: 280,
    body: `Following markets often appears to be a solitary activity. A person sits at a screen, checks prices, reads headlines, and makes a decision. But financial literacy does not grow only through individual knowledge. It becomes stronger when people ask questions, discuss ideas, and see different perspectives inside the right community.

The first benefit of community learning is rhythm. A person may abandon many things when learning alone. But when a group has a regular agenda, following the topic becomes more sustainable. Weekly leagues, periodic competitions, and shared report readings strengthen that rhythm.

In communities built on trust, such as Rotary, this structure can work naturally. People can share not only outcomes but also reasoning. One member explains why they increased gold exposure, another explains caution toward technology shares, and another links currency expectations to macro data.

Enbilir does not aim to create a noisy investment forum. It aims to create a calmer education-focused area. A setting where everyone tells each other what to buy or sell is less valuable than one where the main question is: What was your reason?

Community learning also normalizes mistakes. Everyone can be wrong in markets. The important thing is not never being wrong, but recognizing the mistake and not repeating it blindly. Virtual portfolios and leagues make mistakes visible in a safe space.

A user's portfolio may rise while the decision process is weak. Another user's short-term result may be poor while the method is solid. Discussing that difference is essential. Financial literacy does not grow by applauding only the winner; it grows by understanding the method.

Macro reports become more meaningful inside a community. Gold, silver, the dollar, the euro, Turkish lira, BIST 100, Dow Jones, Nasdaq, oil, energy shares, AI-related stocks, and Asian markets each provide information. But learning deepens when the group discusses how that information affects virtual portfolios.

The boundary is important: no investment advice. The language of the platform should remain within education, personal opinion, and evaluation. Each user determines their own risk, time horizon, and goal. The community does not decide for them; it helps them think better.

Content must also be understandable. Long technical language can look impressive but may leave many people outside. Good content simplifies complexity without trivializing it. The user should feel, I can follow this too.

This is the learning style I value: simple explanation, example, and application. A blog article opens a concept, a report connects it to markets, the virtual portfolio shows practice, and the league brings the process into the community.

Not being alone in markets does not mean giving decision responsibility to someone else. It means building a better environment for more conscious decisions. The community side of Enbilir matters because its purpose is not to make everyone think the same; it is to help everyone think better.`,
  },
];

const dbPath = getDatabasePath();
const db = new Database(dbPath);
const now = new Date().toISOString();

const stmt = db.prepare(`
  INSERT INTO ManagedContentItem (
    id, type, locale, title, excerpt, body, imageUrl, videoUrl, linkUrl, linkLabel,
    sortOrder, isFeatured, isActive, publishedAt, createdAt, updatedAt
  ) VALUES (
    @id, 'BLOG', 'en', @title, @excerpt, @body, NULL, NULL, NULL, NULL,
    @sortOrder, 1, 1, @publishedAt, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    type = excluded.type,
    locale = excluded.locale,
    title = excluded.title,
    excerpt = excluded.excerpt,
    body = excluded.body,
    sortOrder = excluded.sortOrder,
    isFeatured = excluded.isFeatured,
    isActive = excluded.isActive,
    publishedAt = excluded.publishedAt,
    updatedAt = excluded.updatedAt
`);

db.transaction(() => {
  for (const post of posts) {
    stmt.run({ ...post, publishedAt: now, createdAt: now, updatedAt: now });
  }
})();

console.log(`Upserted ${posts.length} English managed blog posts into ${dbPath}`);
