import Layout from "../components/Layout";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchShopifyCollections, fetchShopifyMenuAsNavItems } from "../lib/shopify";
import { getNavItems } from "../lib/navUtils";
import { navLinks as baseNavLinks } from "../lib/siteContent";

export default function ProfilePage({ navItems }) {
  const { user, isAuthenticated, loading, logout, token, refreshProfile } = useAuth();
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    country: "",
  });
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  if (loading) {
    return (
      <Layout navItems={navItems}>
        <section className="profile-page container profile-empty">
          <p>Loading your account…</p>
        </section>
      </Layout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Layout navItems={navItems}>
        <section className="profile-page container profile-empty">
          <p>You need to sign in to view your account.</p>
          <p>Use the sign-in button in the header.</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout navItems={navItems}>
      <section className="profile-page container">
        <header className="profile-hero">
          <div>
            <h1>{user.email}</h1>
            <p>Welcome back, {user.name}.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={logout}>
            sign out
          </button>
        </header>

        <div className="profile-grid">
          <section className="profile-card">
            <div className="profile-card-header">
              <h2>Account info</h2>
            </div>
            <dl>
              <div>
                <dt>Name</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{user.memberSince || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="profile-card">
            <div className="profile-card-header">
              <h2>Primary address</h2>
            </div>
            {user.address ? (
              <address>
                {user.address.address1}
                <br />
                {[user.address.city, user.address.province, user.address.zip].filter(Boolean).join(", ")}
                <br />
                {user.address.country}
              </address>
            ) : (
              <p>No primary address on file.</p>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (user.address) {
                  setAddressForm({
                    address1: user.address.address1 || "",
                    address2: user.address.address2 || "",
                    city: user.address.city || "",
                    province: user.address.province || "",
                    zip: user.address.zip || "",
                    country: user.address.country || "",
                  });
                }
                setAddressModalOpen(true);
              }}
            >
              {user.address ? "Edit saved addresses" : "Add address"}
            </button>
          </section>

          {addressModalOpen && (
            <div
              className="auth-modal-backdrop"
              role="dialog"
              aria-modal="true"
              onClick={(e) => {
                if (e.target === e.currentTarget) setAddressModalOpen(false);
              }}
            >
              <div className="auth-modal">
                <div className="auth-modal-header">
                  <h2>{user.address ? "Edit Address" : "Add Address"}</h2>
                  <button
                    type="button"
                    className="auth-close-btn"
                    onClick={() => setAddressModalOpen(false)}
                    aria-label="Close dialog"
                  >
                    ✕
                  </button>
                </div>
                <form
                  className="auth-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!addressForm.address1 || !addressForm.city || !addressForm.country) {
                      alert("Please fill in all required fields");
                      return;
                    }
                    setAddressSubmitting(true);
                    try {
                      const response = await fetch("/api/auth/update-address", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          token,
                          address: addressForm,
                          addressId: user.address?.id || null,
                          setAsDefault: true,
                        }),
                      });

                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data.message || "Failed to update address");
                      }

                      // Refresh profile to get updated address
                      await refreshProfile();
                      setAddressModalOpen(false);
                      setAddressForm({
                        address1: "",
                        address2: "",
                        city: "",
                        province: "",
                        zip: "",
                        country: "",
                      });
                    } catch (error) {
                      console.error("Address update error:", error);
                      alert(error.message || "Failed to update address. Please try again.");
                    } finally {
                      setAddressSubmitting(false);
                    }
                  }}
                >
                  <label>
                    Address Line 1 *
                    <input
                      type="text"
                      value={addressForm.address1}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, address1: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Address Line 2
                    <input
                      type="text"
                      value={addressForm.address2}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, address2: e.target.value }))}
                    />
                  </label>
                  <label>
                    City *
                    <input
                      type="text"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    State/Province
                    <input
                      type="text"
                      value={addressForm.province}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, province: e.target.value }))}
                    />
                  </label>
                  <label>
                    ZIP/Postal Code
                    <input
                      type="text"
                      value={addressForm.zip}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, zip: e.target.value }))}
                    />
                  </label>
                  <label>
                    Country *
                    <input
                      type="text"
                      value={addressForm.country}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, country: e.target.value }))}
                      required
                    />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={addressSubmitting}>
                    {addressSubmitting ? "Saving..." : user.address ? "Update Address" : "Add Address"}
                  </button>
                </form>
              </div>
            </div>
          )}

          <section className="profile-card profile-orders">
            <div className="profile-card-header">
              <h2>Order history</h2>
              <Link href="/cart">View current cart</Link>
            </div>
            {user.orders?.length ? (
              <div className="profile-order-list">
                {user.orders.map((order) => (
                  <article key={order.id || order.name}>
                    <header>
                      <strong>{order.name || order.id}</strong>
                      <span>{order.status}</span>
                    </header>
                    <p>Placed on {order.date} · Total {order.total || "—"}</p>
                    <ul>
                      {order.items?.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <div className="profile-order-actions">
                      <button type="button">View details</button>
                      <button type="button">Track package</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p>You haven’t placed any orders yet.</p>
            )}
          </section>
        </div>
      </section>
    </Layout>
  );
}

export async function getServerSideProps() {
  try {
    const [collections, menuItems] = await Promise.all([
      fetchShopifyCollections(20),
      fetchShopifyMenuAsNavItems("main-menu").catch((err) => {
        console.error("Failed to fetch menu:", err);
        return [];
      }),
    ]);
    const navItems = getNavItems(menuItems, collections, baseNavLinks);
    return {
      props: {
        navItems,
      },
    };
  } catch (error) {
    console.error("Failed to load profile nav items", error);
    return {
      props: {
        navItems: baseNavLinks,
      },
    };
  }
}

