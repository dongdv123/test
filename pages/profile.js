import Layout from "../components/Layout";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { fetchShopifyCollections } from "../lib/shopify";
import { mapCollectionsToNav } from "../lib/navUtils";
import { navLinks as baseNavLinks } from "../lib/siteContent";

export default function ProfilePage({ navItems }) {
  const { user, isAuthenticated, loading, logout } = useAuth();

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
            <button type="button" className="btn-secondary">
              Edit saved addresses
            </button>
          </section>

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
    const collections = await fetchShopifyCollections(20);
    const navItems = mapCollectionsToNav(collections);
    return {
      props: {
        navItems: navItems.length ? navItems : baseNavLinks,
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

