import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../components/Layout";
import { fetchAllProductTags, fetchShopifyCollections } from "../lib/shopify";
import { mapCollectionsToNav } from "../lib/navUtils";
import { navLinks as baseNavLinks } from "../lib/siteContent";

const recipients = [
  { id: "anyone", label: "anyone" },
  { id: "mom", label: "mom" },
  { id: "dad", label: "dad" },
  { id: "son", label: "son" },
  { id: "daughter", label: "daughter" },
  { id: "husband", label: "husband" },
  { id: "wife", label: "wife" },
  { id: "brother", label: "brother" },
  { id: "sister", label: "sister" },
  { id: "grandma", label: "grandma" },
  { id: "grandpa", label: "grandpa" },
  { id: "boyfriend", label: "boyfriend" },
  { id: "girlfriend", label: "girlfriend" },
  { id: "friend", label: "friend" },
  { id: "co-worker", label: "co-worker" },
  { id: "kid", label: "kid" },
];

export default function GiftFinderPage({ productTags = [], navItems = baseNavLinks }) {
  const router = useRouter();
  const [selectedRecipient, setSelectedRecipient] = useState("anyone");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState("");

  const toggleInterest = (interestId) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId]
    );
  };

  const addCustomInterest = () => {
    if (customInterest.trim()) {
      const interestId = customInterest.trim().toLowerCase().replace(/\s+/g, "-");
      if (!selectedInterests.includes(interestId)) {
        setSelectedInterests((prev) => [...prev, interestId]);
      }
      setCustomInterest("");
    }
  };

  const handleFindGifts = () => {
    const searchTerms = [];
    
    if (selectedRecipient && selectedRecipient !== "anyone") {
      searchTerms.push(selectedRecipient);
    }
    
    if (selectedInterests.length > 0) {
      searchTerms.push(...selectedInterests);
    }

    const searchQuery = searchTerms.join(" ");
    const url = searchQuery ? `/?search=${encodeURIComponent(searchQuery)}` : "/";
    
    router.push(url);
  };

  return (
    <>
      <Head>
        <title>Gift Finder - Gikzo</title>
        <meta name="description" content="Find the perfect gift based on recipient and interests" />
      </Head>
      <Layout navItems={navItems}>
        <div className="gift-finder-page">
          <div className="gift-finder-header">
            <span className="gift-finder-icon">🎁</span>
            <h1>Gift Finder</h1>
          </div>

          <div className="gift-finder-section">
            <h2>Who are you shopping for?</h2>
            <div className="gift-finder-options">
              {recipients.map((recipient) => (
                <button
                  key={recipient.id}
                  type="button"
                  className={`gift-finder-option ${selectedRecipient === recipient.id ? "selected" : ""}`}
                  onClick={() => setSelectedRecipient(recipient.id)}
                >
                  {recipient.label}
                </button>
              ))}
            </div>
          </div>

          <div className="gift-finder-section">
            <h2>What are they into?</h2>
            <p className="gift-finder-subtitle">Select all that apply</p>
            <div className="gift-finder-options">
              {productTags.length > 0 ? (
                productTags.map((tag) => {
                  // Convert tag from "tag-name" to "tag name" for display
                  const displayLabel = tag.replace(/-/g, " ");
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`gift-finder-option ${selectedInterests.includes(tag) ? "selected" : ""}`}
                      onClick={() => toggleInterest(tag)}
                    >
                      {displayLabel}
                    </button>
                  );
                })
              ) : (
                <p>Loading tags...</p>
              )}
            </div>
          </div>

          <div className="gift-finder-section">
            <h2>Anything else?</h2>
            <div className="gift-finder-custom-input">
              <input
                type="text"
                placeholder="unicorns, history, etc."
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addCustomInterest();
                  }
                }}
              />
              <button type="button" className="gift-finder-add-btn" onClick={addCustomInterest}>
                add
              </button>
            </div>
          </div>

          <div className="gift-finder-section gift-finder-actions-section">
            <h2>Shop our suggestions</h2>
            <button type="button" className="btn btn-primary gift-finder-cta" onClick={handleFindGifts}>
              find just the right gift
            </button>
          </div>
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps() {
  try {
    const [tags, collections] = await Promise.all([
      fetchAllProductTags(250),
      fetchShopifyCollections(20),
    ]);
    const navItems = mapCollectionsToNav(collections);
    return {
      props: {
        productTags: tags || [],
        navItems: navItems.length ? navItems : baseNavLinks,
      },
    };
  } catch (error) {
    console.error("Failed to fetch data for gift finder", error);
    return {
      props: {
        productTags: [],
        navItems: baseNavLinks,
      },
    };
  }
}

