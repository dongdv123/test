import "../styles/globals.css";
import "../styles/components/auth-modal.css";
import "../styles/components/skeleton.css";
import "../styles/components/product-card.css";
import "../styles/components/header.css";
import "../styles/components/footer.css";
import "../styles/components/buttons.css";
import "../styles/components/slider.css";
import "../styles/components/featured-reviews.css";
import "../styles/components/collection-products.css";
import "../styles/product-detail.css";
import "../styles/bundle-builder.css";
import "../styles/cart.css";
import "../styles/checkout.css";
import "../styles/gift-finder.css";
import "../styles/search.css";
import "../styles/profile.css";
import "../styles/tablet.css";
import "../styles/mobile.css";
import { AuthProvider } from "../context/AuthContext";
import { WishlistProvider } from "../context/WishlistContext";
import { CartProvider } from "../context/CartContext";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <Component {...pageProps} />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

