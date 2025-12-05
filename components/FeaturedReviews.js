import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";

// Sample reviewers data
const reviewers = [
  { name: "KELLY", location: "CHICAGO, IL" },
  { name: "AWTYMOM", location: "HOUSTON TEXAS" },
  { name: "HAPPY", location: "UNDISCLOSED" },
  { name: "BUSYMOMOF3", location: "ELMA, NY" },
  { name: "SARAH", location: "NEW YORK, NY" },
  { name: "MIKE", location: "LOS ANGELES, CA" },
  { name: "JENNIFER", location: "BOSTON, MA" },
  { name: "DAVID", location: "SEATTLE, WA" },
];

// Generate review text based on product
const generateReviewText = (product, index) => {
  const productTitle = product.title?.toLowerCase() || "";
  const productType = product.productType?.toLowerCase() || "";
  const tags = (product.tags || []).map(t => t.toLowerCase());
  
  const reviewTemplates = [
    `This ${productType || "product"} exceeded all my expectations! The quality is outstanding and it makes a perfect gift. I've already recommended it to several friends who are looking for something unique and special.`,
    `I was looking for something different and this ${productType || "item"} was exactly what I needed. The attention to detail is remarkable and it's clear that a lot of care went into creating this. Highly satisfied with my purchase!`,
    `What a wonderful ${productType || "product"}! It arrived beautifully packaged and the craftsmanship is excellent. This is the kind of gift that people remember and appreciate. I'll definitely be ordering more items from this collection.`,
    `This ${productType || "item"} is perfect for anyone who appreciates quality and uniqueness. I've received so many compliments on it already. The design is thoughtful and it's clear that this was made with care and attention to detail.`,
    `I'm so happy with this purchase! The ${productType || "product"} is even better than I expected. It's well-made, beautiful, and makes a great conversation piece. This is exactly the kind of unique item I love to give as a gift.`,
    `This ${productType || "item"} is absolutely stunning. The quality is top-notch and it's clear that this was crafted with passion. I've already ordered another one as a gift because I know the recipient will love it just as much as I do.`,
  ];
  
  return reviewTemplates[index % reviewTemplates.length];
};

// Generate review title based on product
const generateReviewTitle = (product, index) => {
  const productTitle = product.title?.toLowerCase() || "";
  const productType = product.productType?.toLowerCase() || "";
  
  const titleTemplates = [
    `Perfect gift for someone special`,
    `Unique and beautifully crafted`,
    `Exceeded all expectations`,
    `Absolutely love this ${productType || "product"}`,
    `High quality and thoughtful design`,
    `A standout piece that gets compliments`,
  ];
  
  return titleTemplates[index % titleTemplates.length];
};

export default function FeaturedReviews({ products = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackRef = useRef(null);

  // Generate reviews from products (take first 6)
  const reviews = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    return products.slice(0, 6).map((product, index) => {
      const reviewer = reviewers[index % reviewers.length];
      return {
        id: product.id || `review-${index}`,
        rating: 5,
        title: generateReviewTitle(product, index),
        text: generateReviewText(product, index),
        reviewer: reviewer.name,
        location: reviewer.location,
        product: {
          image: product.img || product.image?.src || "",
          name: product.title || "",
          price: product.price || "",
          handle: product.handle || "",
        },
      };
    });
  }, [products]);

  const totalReviews = reviews.length;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleScroll = () => {
      const scrollLeft = track.scrollLeft;
      const cardWidth = track.children[0]?.offsetWidth || 0;
      const gap = 20; // gap between cards
      const cardWidthWithGap = cardWidth + gap;
      const newIndex = Math.round(scrollLeft / cardWidthWithGap);
      setCurrentIndex(Math.min(newIndex, totalReviews - 1));
    };

    track.addEventListener("scroll", handleScroll);
    return () => track.removeEventListener("scroll", handleScroll);
  }, [totalReviews]);

  const scrollToIndex = (index) => {
    const track = trackRef.current;
    if (!track) return;

    const cardWidth = track.children[0]?.offsetWidth || 0;
    const gap = 20;
    const cardWidthWithGap = cardWidth + gap;
    const scrollPosition = index * cardWidthWithGap;

    track.scrollTo({
      left: scrollPosition,
      behavior: "smooth",
    });
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalReviews - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  const renderStars = (rating) => {
    return "★".repeat(rating);
  };

  const canScrollPrev = currentIndex > 0;
  const canScrollNext = currentIndex < totalReviews - 1;

  // Don't render if no reviews
  if (totalReviews === 0) {
    return null;
  }

  return (
    <section className="featured-reviews-section">
      <div>
        <h2 className="featured-reviews-title">featured customer reviews</h2>
        <div className="featured-reviews-wrapper">
          <button
            className="featured-reviews-nav featured-reviews-nav-prev"
            onClick={handlePrev}
            disabled={!canScrollPrev}
            aria-label="Previous reviews"
          >
            <span className="material-icons">chevron_left</span>
          </button>
          <div className="featured-reviews-carousel">
            <div className="featured-reviews-track" ref={trackRef}>
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="featured-review-card"
                >
                  <div className="featured-review-stars">
                    {renderStars(review.rating)}
                  </div>
                  <h3 className="featured-review-title">{review.title}</h3>
                  <p className="featured-review-text">{review.text}</p>
                  <div className="featured-review-author">
                    {review.reviewer} | {review.location}
                  </div>
                  <div className="featured-review-product">
                    <img
                      src={review.product.image}
                      alt={review.product.name}
                      className="featured-review-product-image"
                      loading="lazy"
                    />
                    <div className="featured-review-product-info">
                      <Link
                        href={`/products/${review.product.handle}`}
                        className="featured-review-product-name"
                      >
                        {review.product.name}
                      </Link>
                      <div className="featured-review-product-price">
                        {review.product.price}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <button
            className="featured-reviews-nav featured-reviews-nav-next"
            onClick={handleNext}
            disabled={!canScrollNext}
            aria-label="Next reviews"
          >
            <span className="material-icons">chevron_right</span>
          </button>
        </div>
      </div>
    </section>
  );
}

