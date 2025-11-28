const skeletonArray = (length) => Array.from({ length });

const sliderPlaceholder = skeletonArray(5);
const quickPlaceholder = skeletonArray(6);
const chipPlaceholder = skeletonArray(4);

const SkeletonLine = ({ width = "100%", height = 16, rounded = true, className = "" }) => (
  <span
    className={`skeleton-block ${rounded ? "rounded" : ""} ${className}`}
    style={{ width, height }}
    aria-hidden="true"
  />
);

const SliderSkeleton = () => (
  <section className="section-shell slider-full skeleton-panel">
    <SkeletonLine width="40%" height={28} className="mb-20" rounded={false} />
    <div className="slider-shell">
      <div className="slider-track">
        {sliderPlaceholder.map((_, idx) => (
          <article className="slider-card skeleton-card" key={`slider-skeleton-${idx}`}>
            <span className="skeleton-block media" aria-hidden="true" style={{ height: 200 }} />
            <div className="slider-card-body">
              <SkeletonLine width="80%" />
              <SkeletonLine width="50%" />
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const HomeSkeleton = () => (
  <>
    <section className="quick-row">
      <div className="container">
        <div className="quick-carousel">
          <div className="quick-track">
            {quickPlaceholder.map((_, idx) => (
              <article className="quick-card skeleton-quick-card" key={`quick-skeleton-${idx}`}>
                <span className="skeleton-block icon" aria-hidden="true" />
                <SkeletonLine width="70%" />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="hero-feature skeleton-panel">
      <div className="hero-media skeleton-card" aria-hidden="true" />
      <div className="hero-copy">
        <SkeletonLine width="45%" height={14} />
        <SkeletonLine width="90%" height={42} className="mb-8" rounded={false} />
        <SkeletonLine width="85%" height={32} className="mb-8" rounded={false} />
        <SkeletonLine width="70%" height={32} className="mb-20" rounded={false} />
        <span className="skeleton-block btn" aria-hidden="true" />
      </div>
    </section>

    <section className="section-shell">
      <SkeletonLine width="40%" height={30} className="mb-20" rounded={false} />
      <div className="chip-grid">
        {chipPlaceholder.map((_, idx) => (
          <span className="chip skeleton-pill" key={`chip-skeleton-${idx}`} aria-hidden="true" />
        ))}
      </div>
    </section>

    <SliderSkeleton />
    <SliderSkeleton />

    <section className="maker-feature skeleton-panel">
      <div className="maker-grid">
        {skeletonArray(4).map((_, idx) => (
          <span className="skeleton-block media" key={`maker-skeleton-${idx}`} aria-hidden="true" style={{ height: 140 }} />
        ))}
      </div>
      <div className="maker-copy">
        <SkeletonLine width="30%" height={14} />
        <SkeletonLine width="80%" height={34} className="mb-10" rounded={false} />
        <SkeletonLine width="90%" />
        <SkeletonLine width="75%" />
        <SkeletonLine width="60%" />
        <span className="skeleton-block btn" aria-hidden="true" />
      </div>
    </section>

    <section className="better-give skeleton-panel">
      <div>
        <SkeletonLine width="26%" height={14} />
        <SkeletonLine width="70%" height={30} className="mb-6" rounded={false} />
        <SkeletonLine width="95%" />
        <SkeletonLine width="88%" />
        <SkeletonLine width="60%" />
        <span className="skeleton-block btn" aria-hidden="true" />
      </div>
      <span className="skeleton-block media" aria-hidden="true" style={{ height: 240 }} />
    </section>
  </>
);

const ProductSkeleton = () => (
  <>
    <nav className="collection-breadcrumb container skeleton-panel">
      <SkeletonLine width="60%" height={18} rounded={false} />
    </nav>

    <section className="product-hero skeleton-panel">
      <div className="product-gallery">
        <span className="skeleton-block media" aria-hidden="true" style={{ height: 420 }} />
        <div className="product-thumbnails">
          {skeletonArray(4).map((_, idx) => (
            <span
              key={`thumb-skeleton-${idx}`}
              className="skeleton-block"
              aria-hidden="true"
              style={{ height: 70, borderRadius: 16 }}
            />
          ))}
        </div>
      </div>
      <div className="product-info">
        <SkeletonLine width="35%" height={18} />
        <SkeletonLine width="85%" height={40} className="mb-10" rounded={false} />
        <SkeletonLine width="45%" height={32} className="mb-6" />
        <SkeletonLine width="55%" height={16} className="mb-10" />
        <SkeletonLine width="95%" />
        <SkeletonLine width="88%" />
        <SkeletonLine width="76%" className="mb-20" />

        <div className="product-options">
          {skeletonArray(2).map((_, idx) => (
            <div key={`option-skeleton-${idx}`}>
              <SkeletonLine width="30%" height={16} className="mb-6" />
              <div className="option-values">
                {skeletonArray(3).map((_, pillIdx) => (
                  <span
                    key={`option-pill-${idx}-${pillIdx}`}
                    className="skeleton-block"
                    style={{ width: 90, height: 32, borderRadius: 999 }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="product-cta" style={{ marginTop: 20 }}>
          <span className="skeleton-block btn" aria-hidden="true" />
          <span className="skeleton-block" style={{ width: 180, height: 44, borderRadius: 999 }} aria-hidden="true" />
        </div>

        <div className="product-support" style={{ marginTop: 20 }}>
          <SkeletonLine width="90%" />
          <SkeletonLine width="80%" />
          <SkeletonLine width="60%" />
        </div>
      </div>
    </section>

    <section className="product-details container skeleton-panel">
      <div>
        <SkeletonLine width="40%" height={28} className="mb-10" rounded={false} />
        <SkeletonLine width="95%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="70%" />
      </div>

      <div>
        <SkeletonLine width="45%" height={28} className="mb-10" rounded={false} />
        <SkeletonLine width="95%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="85%" />
        <SkeletonLine width="65%" />
      </div>
    </section>
  </>
);

const CollectionSkeleton = () => (
  <>
    <header className="collection-page-header skeleton-panel">
      <div className="container">
        <SkeletonLine width="20%" height={16} className="mb-8" />
        <SkeletonLine width="50%" height={38} className="mb-10" rounded={false} />
        <SkeletonLine width="85%" />
        <SkeletonLine width="70%" />
      </div>
    </header>

    <section className="section-shell skeleton-panel">
      <div className="collection-grid">
        {skeletonArray(8).map((_, idx) => (
          <article className="collection-product-card skeleton-card" key={`collection-skeleton-${idx}`}>
            <span className="skeleton-block media" aria-hidden="true" style={{ height: 200 }} />
            <div className="collection-card-body">
              <SkeletonLine width="30%" height={14} />
              <SkeletonLine width="80%" height={20} rounded={false} />
              <SkeletonLine width="50%" />
              <SkeletonLine width="40%" />
            </div>
          </article>
        ))}
      </div>
    </section>
  </>
);

const CheckoutSkeleton = () => (
  <div className="checkout-page skeleton-panel">
    <div className="checkout-form">
      <SkeletonLine width="35%" height={34} className="mb-20" rounded={false} />
      {skeletonArray(4).map((_, idx) => (
        <section className="checkout-section" key={`checkout-section-${idx}`}>
          <SkeletonLine width="45%" height={20} className="mb-10" rounded={false} />
          <SkeletonLine width="100%" />
          <SkeletonLine width="90%" />
          <SkeletonLine width="80%" />
        </section>
      ))}
      <span className="skeleton-block btn" style={{ width: "100%" }} aria-hidden="true" />
    </div>
    <aside className="checkout-summary">
      <SkeletonLine width="60%" height={24} className="mb-16" rounded={false} />
      {skeletonArray(3).map((_, idx) => (
        <div className="summary-item" key={`summary-skeleton-${idx}`}>
          <span className="skeleton-block media" style={{ width: 60, height: 60 }} />
          <div className="summary-meta" style={{ width: "60%" }}>
            <SkeletonLine width="80%" />
            <SkeletonLine width="40%" />
          </div>
          <SkeletonLine width="20%" />
        </div>
      ))}
      <SkeletonLine width="90%" />
      <SkeletonLine width="75%" />
      <SkeletonLine width="60%" />
    </aside>
  </div>
);

const WishlistSkeleton = () => (
  <section className="section-shell skeleton-panel">
    <SkeletonLine width="30%" height={40} className="mb-20" rounded={false} />
    <div className="collection-grid">
      {skeletonArray(6).map((_, idx) => (
        <article className="collection-product-card skeleton-card" key={`wishlist-skeleton-${idx}`}>
          <span className="skeleton-block media" style={{ height: 200 }} />
          <div className="collection-card-body">
            <SkeletonLine width="70%" height={24} rounded={false} />
            <SkeletonLine width="40%" />
          </div>
        </article>
      ))}
    </div>
  </section>
);

const DefaultSkeleton = () => (
  <section className="section-shell skeleton-panel">
    <SkeletonLine width="40%" height={36} className="mb-16" rounded={false} />
    <SkeletonLine width="95%" />
    <SkeletonLine width="88%" />
    <SkeletonLine width="70%" />
  </section>
);

const matchers = [
  { test: (path) => path === "/" || path === "", component: HomeSkeleton },
  { test: (path) => path.startsWith("/products/"), component: ProductSkeleton },
  { test: (path) => path.startsWith("/collections/"), component: CollectionSkeleton },
  { test: (path) => path.startsWith("/checkout"), component: CheckoutSkeleton },
  { test: (path) => path.startsWith("/wishlist"), component: WishlistSkeleton },
];

const normalizePath = (pathname = "/") => {
  if (!pathname) return "/";
  const [path] = pathname.split("?");
  if (!path) return "/";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
};

export default function RouteSkeleton({ pathname = "/" }) {
  const normalized = normalizePath(pathname);
  const match = matchers.find((matcher) => matcher.test(normalized));
  const SkeletonComponent = match ? match.component : DefaultSkeleton;
  return <SkeletonComponent />;
}


