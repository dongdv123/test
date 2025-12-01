import "../styles/globals.css";
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

