import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchShopifyProducts, fetchShopifyCollections } from "../lib/shopify";
import { normalizeProduct } from "../lib/productFormatter";

const navLinks = [
  "new",
  "christmas",
  "gifts",
  "interests",
  "birthday",
  "men",
  "women",
  "kids",
  "kitchen & bar",
  "home & garden",
  "jewelry",
  "corporate gifts",
  "experiences",
  "sale",
];

const quickLinks = [
  {
    label: "Christmas gifts",
    img: "https://images.uncommongoods.com/product/56995/56995_1_640px.jpg",
  },
  {
    label: "for him",
    img: "https://images.uncommongoods.com/product/56858/56858_1_640px.jpg",
  },
  {
    label: "for her",
    img: "https://images.uncommongoods.com/product/56137/56137_1_640px.jpg",
  },
  {
    label: "stocking stuffers",
    img: "https://images.uncommongoods.com/product/56765/56765_1_640px.jpg",
  },
  {
    label: "best-selling gifts",
    img: "https://images.uncommongoods.com/product/56967/56967_1_640px.jpg",
  },
  {
    label: "new",
    img: "https://images.uncommongoods.com/product/56970/56970_1_640px.jpg",
  },
];

const chips = [
  "Ornaments & decor",
  "Stocking stuffers",
  "Christmas gifts for her",
  "Christmas gifts for him",
  "Christmas gifts for kids",
  "Advent calendars",
  "Christmas best-sellers",
  "Personalized Christmas gifts",
];

const fallbackNewItems = [
  {
    title: "best-selling",
    price: "$32.00",
    rating: "★★★★★ · 25",
    img: "https://images.uncommongoods.com/product/56922/56922_1_640px.jpg",
  },
  {
    title: "new",
    price: "$48.00",
    rating: "★★★★★ · 8",
    img: "https://images.uncommongoods.com/product/56907/56907_1_640px.jpg",
  },
  {
    title: "sports & outdoor play",
    price: "$55.00",
    rating: "★★★★☆ · 6",
    img: "https://images.uncommongoods.com/product/56890/56890_1_640px.jpg",
  },
  {
    title: "stocking stuffers",
    price: "$28.00",
    rating: "★★★★★ · 11",
    img: "https://images.uncommongoods.com/product/56870/56870_1_640px.jpg",
  },
  {
    title: "gifts for men",
    price: "$118.00",
    rating: "★★★★★ · 17",
    img: "https://images.uncommongoods.com/product/56885/56885_1_640px.jpg",
  },
  {
    title: "artisan candles",
    price: "$36.00",
    rating: "★★★★★ · 14",
    img: "https://images.uncommongoods.com/product/56988/56988_1_640px.jpg",
  },
];

const fallbackBestItems = [
  {
    title: "Your Name in a Snowflake Ornament",
    price: "1,200,000 VND",
    rating: "★★★★★ · 623",
    img: "https://images.uncommongoods.com/product/56800/56800_1_640px.jpg",
  },
  {
    title: "Paper Desk Pets",
    price: "480,000 VND",
    rating: "★★★★☆ · 5",
    img: "https://images.uncommongoods.com/product/56940/56940_1_640px.jpg",
  },
  {
    title: "Personalized Pet Portrait Wood Ornament",
    price: "1,350,000 VND",
    rating: "★★★★★ · 35",
    img: "https://images.uncommongoods.com/product/56910/56910_1_640px.jpg",
  },
  {
    title: "Experiment A Day Science Advent",
    price: "1,350,000 VND",
    rating: "★★★★☆ · 3",
    img: "https://images.uncommongoods.com/product/56923/56923_1_640px.jpg",
  },
  {
    title: "Mystery Prize Bath Bomb",
    price: "420,000 VND",
    rating: "★★★★☆ · 6",
    img: "https://images.uncommongoods.com/product/56915/56915_1_640px.jpg",
  },
];

const fallbackTrendingItems = [
  {
    title: "Coat of Arms Personalized Birth Print",
    price: "4,350,000 VND",
    rating: "★★★★★ · 39",
    img: "https://images.uncommongoods.com/product/56981/56981_1_640px.jpg",
  },
  {
    title: "Woodle Crossword Dice Game",
    price: "1,170,000 VND",
    rating: "★★★★★ · 2",
    img: "https://images.uncommongoods.com/product/56955/56955_1_640px.jpg",
  },
  {
    title: "Nostalgic Sports Nuts Sampler",
    price: "2,070,000 VND",
    rating: "★★★★★ · 8",
    img: "https://images.uncommongoods.com/product/56963/56963_1_640px.jpg",
  },
  {
    title: "Gardener's Daily Interactive QR Mug",
    price: "960,000 VND",
    rating: "★★★★★ · 1",
    img: "https://images.uncommongoods.com/product/56958/56958_1_640px.jpg",
  },
  {
    title: "Bookworm Rainbow Socks",
    price: "510,000 VND",
    rating: "★★★★★ · 4",
    img: "https://images.uncommongoods.com/product/56918/56918_1_640px.jpg",
  },
];

const fallbackRecentItems = [
  {
    title: "Retro Games Coding Advent",
    rating: "★★★★☆ · 7",
    img: "https://images.uncommongoods.com/product/56779/56779_1_640px.jpg",
  },
  {
    title: "Crossbody Water Bottle Bag",
    rating: "★★★★★ · 21",
    img: "https://images.uncommongoods.com/product/56859/56859_1_640px.jpg",
  },
  {
    title: "24 Days of Tea Advent Calendar",
    rating: "★★★★★ · 71",
    img: "https://images.uncommongoods.com/product/56788/56788_1_640px.jpg",
  },
  {
    title: "Stitch a Day Advent Embroidery",
    rating: "★★★★☆ · 9",
    img: "https://images.uncommongoods.com/product/56576/56576_1_640px.jpg",
  },
  {
    title: "Little Photographer Kids Camera",
    rating: "★★★★★ · 4",
    img: "https://images.uncommongoods.com/product/56972/56972_1_640px.jpg",
  },
];

const shopColumns = [
  {
    title: "shop by recipient",
    items: ["Women", "Men", "Kids", "Teens", "Dad", "Mom", "Any gender", "Friends"],
  },
  {
    title: "shop by category",
    items: [
      "Personalized",
      "Jewelry",
      "Kitchen",
      "Home decor",
      "Apparel",
      "Food & drink",
      "Gift sets",
      "uncommon green®",
    ],
  },
  {
    title: "shop by occasion",
    items: ["Wedding", "Anniversary", "Housewarming", "Birthday", "Baby shower", "Sympathy", "Get well", "Thank you"],
  },
  {
    title: "shop by interest",
    items: ["Reading", "Geek", "Travel", "Wellness", "Gardening", "Food & drink", "Music", "Baseball"],
  },
];

const trendTabs = ["advent calendar", "cat", "emotional support desk pets", "golf", "puzzle"];
const fallbackTrendCatalog = trendTabs.reduce((acc, tab) => {
  acc[tab] = fallbackTrendingItems;
  return acc;
}, {});

const footerSections = [
  { title: "Need help?", links: ["help center", "contact us"] },
  { title: "About us", links: ["our story", "better to give", "our team", "careers"] },
  {
    title: "Support",
    links: ["track & manage orders", "shipping & returns FAQ", "corporate gifts", "submit feedback"],
  },
];

const TREND_ITEMS_PER_TAB = 5;

const normalizeCollection = (collection) => {
  if (!collection) return null;

  return {
    id: collection.id ? String(collection.id) : collection.handle || collection.title,
    title: collection.title || "Shopify collection",
    handle: collection.handle || "",
  };
};

export default function Home({ shopifyProducts = [], shopifyCollections = [] }) {
  const trackRefs = useRef({});
  const positions = useRef({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTrend, setActiveTrend] = useState(trendTabs[0]);
  const normalizedProducts = useMemo(
    () => (shopifyProducts || []).map(normalizeProduct).filter(Boolean),
    [shopifyProducts],
  );
  const normalizedCollections = useMemo(
    () => (shopifyCollections || []).map(normalizeCollection).filter(Boolean),
    [shopifyCollections],
  );

  const derivedNewItems = normalizedProducts.slice(0, 5);
  const derivedBestItems = normalizedProducts.slice(5, 10);
  const trendSliceStart = 10;
  const trendSliceEnd = trendSliceStart + trendTabs.length * TREND_ITEMS_PER_TAB;
  const derivedTrendProducts = normalizedProducts.slice(trendSliceStart, trendSliceEnd);
  const derivedRecentItems = normalizedProducts.slice(trendSliceEnd, trendSliceEnd + 5);

  const newItems = derivedNewItems.length ? derivedNewItems : fallbackNewItems;
  const bestItems = derivedBestItems.length ? derivedBestItems : fallbackBestItems;
  const recentItems = derivedRecentItems.length ? derivedRecentItems : fallbackRecentItems;
  const navItems = normalizedCollections.length
    ? normalizedCollections
    : navLinks.map((label, index) => ({
        id: `fallback-nav-${index}`,
        title: label,
        handle: "",
      }));

  const trendCatalog = useMemo(() => {
    const catalog = {};
    trendTabs.forEach((tab, index) => {
      const start = index * TREND_ITEMS_PER_TAB;
      const slice = derivedTrendProducts.slice(start, start + TREND_ITEMS_PER_TAB);
      catalog[tab] = slice.length ? slice : fallbackTrendCatalog[tab];
    });
    return catalog;
  }, [derivedTrendProducts]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  const registerTrack = (key) => (el) => {
    if (el) {
      trackRefs.current[key] = el;
    }
  };

  const slide = (key, direction) => {
    const track = trackRefs.current[key];
    if (!track || !track.children.length) return;

    const cardWidth = track.children[0].getBoundingClientRect().width;
    const computed = window.getComputedStyle(track);
    const gap = parseFloat(computed.gap) || parseFloat(computed.columnGap) || 0;
    const step = cardWidth + gap;
    const visible = Math.max(1, Math.floor(track.clientWidth / step));
    const maxIndex = Math.max(track.children.length - visible, 0);

    if (!(key in positions.current)) positions.current[key] = 0;
    positions.current[key] += direction;
    if (positions.current[key] < 0) positions.current[key] = maxIndex;
    if (positions.current[key] > maxIndex) positions.current[key] = 0;

    track.scrollTo({
      left: positions.current[key] * step,
      behavior: "smooth",
    });
  };

  const renderProductCard = (item) => (
    <>
      <img src={item.img} alt={item.title} loading="lazy" />
      <div className="slider-card-body">
        <h4>{item.title}</h4>
        {"price" in item && item.price && <div className="price">{item.price}</div>}
        {item.rating && <div className="rating-text">{item.rating}</div>}
      </div>
    </>
  );

  return (
    <>
      <div className="promo-primary">
        Perks members always get <strong>FREE shipping</strong>. <a href="#">Join today.</a>
      </div>

      <header className="header">
        <div className="container">
          <div className="header-top">
            <div className="logo">
              <span>✶</span> uncommon goods
            </div>
            <label className="search">
              <span style={{ color: "#0c8a68", fontSize: 20 }}>🔍</span>
              <input placeholder="search | gifts for mom who likes beer, books, and gardening" />
            </label>
            <div className="header-icons">
              <div className="header-icon">
                <span>👤</span>
                <a href="#">sign in</a>
              </div>
              <div className="header-icon">
                <span>🤍</span>
                <a href="#">wish list</a>
              </div>
              <div className="header-icon">
                <span>🎁</span>
                <a href="#">gift finder</a>
              </div>
              <div className="header-icon cart-badge" data-count="2">
                <span>🛒</span>
                <a href="#">cart</a>
              </div>
            </div>
          </div>
          <button className="menu-toggle" onClick={() => setMenuOpen((prev) => !prev)}>
            menu ☰
          </button>
          <nav className="nav">
            {navItems.map((item) =>
              item.handle ? (
                <Link
                  key={item.id || item.title}
                  href={`/collections/${item.handle}`}
                  className="nav-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.title}
                </Link>
              ) : (
                <span key={item.id || item.title} className="nav-link disabled">
                  {item.title}
                </span>
              ),
            )}
          </nav>
        </div>
      </header>

      <section className="quick-row">
        <div className="container">
          <div className="quick-carousel">
            <div className="quick-track" ref={registerTrack("quick")}>
              {quickLinks.map((item) => (
                <article className="quick-card" key={item.label}>
                  <img src={item.img} alt={item.label} loading="lazy" />
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
            <button className="prev" onClick={() => slide("quick", -1)}>
              ‹
            </button>
            <button className="next" onClick={() => slide("quick", 1)}>
              ›
            </button>
          </div>
        </div>
      </section>

      <section className="hero-feature">
        <div className="hero-media">
          <img
            src="https://images.uncommongoods.com/images/items/57200/57240_1_940px.jpg"
            alt="glass forest"
            loading="lazy"
          />
        </div>
        <div className="hero-copy">
          <p className="hero-kicker">MERRY AND EXTRAORDINARY</p>
          <h1>unexpected, handmade, and one-of-a-kind gifts</h1>
          <p>Holiday gift guide 2025 · curated by independent makers worldwide. Send magic straight to their doorstep.</p>
          <button className="btn btn-primary">shop uncommon gifts →</button>
        </div>
      </section>

      <section className="section-shell">
        <h2 className="section-head">Stock up on holiday essentials</h2>
        <div className="chip-grid">
          {chips.map((chip) => (
            <button key={chip}>{chip}</button>
          ))}
        </div>
      </section>

      <section className="handmade-spotlight">
        <div>
          <img
            src="https://images.unsplash.com/photo-1489710437720-ebb67ec84dd2?auto=format&fit=crop&w=900&q=80"
            alt="Handmade wolf family sculpture"
            loading="lazy"
          />
        </div>
        <div className="spotlight-copy">
          <small>handmade focus</small>
          <h3>Wolf family wooden sculpture</h3>
          <p>
            Tác phẩm khắc laser trên gỗ phong mô phỏng gia đình sói, điểm nhấn trái tim sơn tay và chữ khắc tên từng
            thành viên giúp khách cảm nhận hơi ấm thủ công độc bản.
          </p>
          <button className="btn btn-primary">khám phá đồ handmade →</button>
        </div>
      </section>

      <section className="section-shell slider-full">
        <h2 className="section-head">New for you</h2>
        <div className="slider-shell">
          <button className="slider-nav prev" onClick={() => slide("new", -1)}>
            ‹
          </button>
          <div className="slider-track" ref={registerTrack("new")}>
            {newItems.map((item) => (
              <article className="slider-card" key={item.id || item.title}>
                {renderProductCard(item)}
              </article>
            ))}
          </div>
          <button className="slider-nav next" onClick={() => slide("new", 1)}>
            ›
          </button>
        </div>
      </section>

      <section className="section-shell slider-full">
        <h2 className="section-head">Best-selling gifts</h2>
        <div className="slider-shell">
          <button className="slider-nav prev" onClick={() => slide("best", -1)}>
            ‹
          </button>
          <div className="slider-track" ref={registerTrack("best")}>
            {bestItems.map((item) => (
              <article className="slider-card" key={item.id || item.title}>
                {renderProductCard(item)}
              </article>
            ))}
          </div>
          <button className="slider-nav next" onClick={() => slide("best", 1)}>
            ›
          </button>
        </div>
      </section>

      <section className="story-section">
        <div className="story-copy">
          <h2>Show them you know them</h2>
          <p>
            Their hobbies, interests, that story they tell each Christmas. From mugs that serve up content about their
            favorite topics to guided experiences that turn stories into a memoir.
          </p>
          <button className="btn btn-primary">shop the gift guide →</button>
        </div>
        <div className="story-cards">
          <article className="story-card">
            <img src="https://images.uncommongoods.com/product/56590/56590_1_640px.jpg" alt="guided memoir" />
            <button>guided memoir</button>
          </article>
          <article className="story-card">
            <img src="https://images.uncommongoods.com/product/56530/56530_1_640px.jpg" alt="daily discovery gifts" />
            <button>daily discovery gifts</button>
          </article>
        </div>
      </section>

      <section className="section-shell slider-full">
        <div className="trending-header">
          <div className="section-head">
            <span className="trend-icon">📈</span> Today's Trending Searches
          </div>
          <div className="trend-tabs">
            {trendTabs.map((tab) => (
              <button
                key={tab}
                className={`trend-tab ${tab === activeTrend ? "active" : ""}`}
                onClick={() => {
                  setActiveTrend(tab);
                  positions.current.trend = 0;
                  trackRefs.current.trend?.scrollTo({ left: 0, behavior: "smooth" });
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="slider-shell trend-slider">
          <button className="slider-nav prev" onClick={() => slide("trend", -1)}>
            ‹
          </button>
          <div className="slider-track" ref={registerTrack("trend")}>
            {trendCatalog[activeTrend].map((item) => (
              <article className="slider-card" key={`${activeTrend}-${item.id || item.title}`}>
                {renderProductCard(item)}
              </article>
            ))}
          </div>
          <button className="slider-nav next" onClick={() => slide("trend", 1)}>
            ›
          </button>
        </div>
      </section>

      <section className="maker-feature">
        <div className="maker-grid">
          <img src="https://images.uncommongoods.com/product/41011/41011_1_640px.jpg" alt="vinyl art 1" />
          <img src="https://images.uncommongoods.com/product/56985/56985_1_640px.jpg" alt="vinyl art 2" />
          <img src="https://images.uncommongoods.com/product/56983/56983_1_640px.jpg" alt="vinyl art 3" />
          <img src="https://images.uncommongoods.com/product/56984/56984_1_640px.jpg" alt="vinyl art 4" />
        </div>
        <div className="maker-copy">
          <small>UNCOMMON MAKER</small>
          <h3>Jeff Davis spreads joy through vinyl</h3>
          <p>
            "I know how exciting it is to give the perfect gift," says Jeff, who crafts his pieces from reclaimed vinyl
            records in Philadelphia. "Take time to connect and spend time with the people you care about."
          </p>
          <button className="btn btn-primary" style={{ width: "max-content" }}>
            see Jeff's work →
          </button>
        </div>
      </section>

      <section className="section-shell">
        <div className="container">
          <div className="holiday-cta">
            <div>
              <p style={{ letterSpacing: "0.3em", color: "#c46621", textTransform: "uppercase" }}>unexpected and affordable</p>
              <h3>Holiday gifts under $50</h3>
              <p>
                We hand-picked this collection of clever surprises under $50 to help you wow everyone on your list while
                sticking to your budget.
              </p>
              <button className="btn btn-primary">shop now</button>
            </div>
            <img src="https://images.uncommongoods.com/product/56993/56993_1_940px.jpg" alt="holiday gifts" loading="lazy" />
          </div>
        </div>
      </section>

      <section className="better-give">
        <img src="https://images.uncommongoods.com/product/56991/56991_1_940px.jpg" alt="breastcancer.org" loading="lazy" />
        <div>
          <small>BETTER TO GIVE</small>
          <h3>Partnering with Breastcancer.org</h3>
          <p>
            Breastcancer.org helps people make sense of complex information about breast health and breast cancer. Choose
            them at checkout and we'll donate $1 ($2 if you're a Perks member) at no cost to you.
          </p>
          <button className="btn btn-primary">shop their gift guide</button>
        </div>
      </section>

      <section className="recent-section slider-full">
        <div className="recent-header">
          <h2>Recently viewed</h2>
          <a href="#">see browsing history →</a>
        </div>
        <div className="slider-shell">
          <button className="slider-nav prev" onClick={() => slide("recent", -1)}>
            ‹
          </button>
          <div className="slider-track" ref={registerTrack("recent")}>
            {recentItems.map((item) => (
              <article className="slider-card" key={item.id || item.title}>
                {renderProductCard(item)}
              </article>
            ))}
          </div>
          <button className="slider-nav next" onClick={() => slide("recent", 1)}>
            ›
          </button>
        </div>
      </section>

      <section className="what-section">
        <h2 className="section-head">what makes us uncommon</h2>
        <div className="what-grid">
          <article>
            <span>🙂</span>
            <h4>Independent makers</h4>
            <p>creating innovative designs</p>
          </article>
          <article>
            <span>💚</span>
            <h4>Better to give</h4>
            <p>over $3 million donated</p>
          </article>
          <article>
            <span>Ⓑ</span>
            <h4>Founding B Corp</h4>
            <p>since 2007</p>
          </article>
          <article>
            <span>🐻</span>
            <h4>No leather, feathers, or fur</h4>
            <p>since 1999</p>
          </article>
          <article>
            <span>🚚</span>
            <h4>Free shipping</h4>
            <p>for Uncommon Perks members</p>
          </article>
          <article>
            <span>♻️</span>
            <h4>Forever returns</h4>
            <p>if you don't love it</p>
          </article>
        </div>
      </section>

      <section className="section-shell">
        <div className="container">
          <div className="shop-grid">
            {shopColumns.map((column) => (
              <div className="shop-card" key={column.title}>
                <div style={{ textTransform: "uppercase", color: "#c46621", letterSpacing: "0.2em" }}>{column.title}</div>
                {column.items.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="container">
        <div className="footer-top">
          {footerSections.map((section) => (
            <div className="footer-col" key={section.title}>
              <h4>{section.title}</h4>
              <ul>
                {section.links.map((link) => (
                  <li key={link}>{link}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="footer-col">
            <h4>Sign up for emails</h4>
            <ul>
              <li>New subscribers get a $5 promo code.</li>
              <li>
                <input
                  style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 10, width: "100%" }}
                  placeholder="Email address"
                />
              </li>
              <li>
                <button className="btn btn-primary" style={{ padding: "12px 24px" }}>
                  sign up
                </button>
              </li>
            </ul>
          </div>
        </div>
        <p className="footer-bottom">
          Shipping to: 🇻🇳 · change · ©2025 Uncommon Goods™ LLC · 888-365-0056 · Brooklyn, NY
        </p>
      </footer>
    </>
  );
}

export async function getServerSideProps() {
  try {
    const [products, collections] = await Promise.all([fetchShopifyProducts(50), fetchShopifyCollections(12)]);
    return {
      props: {
        shopifyProducts: products,
        shopifyCollections: collections,
      },
    };
  } catch (error) {
    console.error("Failed to sync Shopify data from Shopify API", error);
    return {
      props: {
        shopifyProducts: [],
        shopifyCollections: [],
      },
    };
  }
}

