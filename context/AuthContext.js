import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "gikzo-auth-token";

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshProfile: async () => {},
});

const readToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
};

const writeToken = (value) => {
  if (typeof window === "undefined") return;
  if (value) {
    window.localStorage.setItem(STORAGE_KEY, value);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

const formatCurrency = (amount, currency = "USD") => {
  if (!amount) return null;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${currency} ${amount}`;
  }
};

const mapCustomerToUser = (customer) => {
  if (!customer) return null;
  const name = customer.displayName || [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  const orders =
    customer.orders?.edges?.map(({ node }) => ({
      id: node.id,
      name: node.name,
      date: new Date(node.processedAt).toLocaleDateString(),
      status: node.fulfillmentStatus || node.financialStatus || "Processing",
      total: formatCurrency(node.totalPriceV2?.amount, node.totalPriceV2?.currencyCode),
      items: node.lineItems?.edges?.map(({ node: line }) => `${line.title} ×${line.quantity}`) || [],
    })) || [];

  return {
    id: customer.id,
    name: name || customer.email,
    email: customer.email,
    phone: customer.phone || "",
    memberSince: new Date(customer.createdAt).toLocaleString("en-US", { month: "long", year: "numeric" }),
    address: customer.defaultAddress || null,
    orders,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    writeToken(null);
  }, []);

  const fetchProfile = useCallback(
    async (accessToken) => {
      const activeToken = accessToken || token;
      if (!activeToken) {
        setUser(null);
        return null;
      }

      const response = await fetch("/api/auth/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activeToken }),
      });

      if (!response.ok) {
        clearAuth();
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || "Unable to load profile");
      }

      const payload = await response.json();
      const mapped = mapCustomerToUser(payload);
      setUser(mapped);
      return mapped;
    },
    [token, clearAuth],
  );

  useEffect(() => {
    let mounted = true;
    const hydratedToken = readToken();
    if (hydratedToken) {
      setToken(hydratedToken);
      fetchProfile(hydratedToken)
        .catch(() => {
          if (mounted) {
            clearAuth();
          }
        })
        .finally(() => mounted && setLoading(false));
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [fetchProfile, clearAuth]);

  const handleAuthResponse = useCallback(
    async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Unable to process request");
      }
      if (!result?.accessToken && !result?.token?.accessToken) {
        return result;
      }

      const accessToken = result.accessToken || result.token.accessToken;
      setToken(accessToken);
      writeToken(accessToken);
      await fetchProfile(accessToken);
      return result;
    },
    [fetchProfile],
  );

  const login = useCallback(
    async ({ email, password }) => {
      if (!email || !password) throw new Error("Email and password are required.");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return handleAuthResponse(response);
    },
    [handleAuthResponse],
  );

  const register = useCallback(
    async ({ name, email, password }) => {
      if (!name || !email || !password) throw new Error("All fields are required.");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await handleAuthResponse(response);
      if (!result.token?.accessToken) {
        throw new Error(result.message || "Account created. Please sign in.");
      }
      return result;
    },
    [handleAuthResponse],
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
      refreshProfile: fetchProfile,
    }),
    [user, token, loading, login, register, logout, fetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

