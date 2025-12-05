import { shopifyCustomerRequest } from "../../../lib/shopifyCustomer";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";

const MUTATION = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit({ key: `login:${ip}`, windowMs: 60_000, max: 30 })) {
    return res.status(429).json({ message: "Too many attempts. Please wait and try again." });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = email.trim();
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }

  if (password.trim().length === 0) {
    return res.status(400).json({ message: "Password is required." });
  }

  try {
    const data = await shopifyCustomerRequest(MUTATION, {
      input: { email: trimmedEmail, password: password.trim() },
    });

    const result = data.customerAccessTokenCreate;
    if (result.userErrors?.length) {
      return res.status(401).json({ message: result.userErrors[0].message });
    }

    return res.status(200).json(result.customerAccessToken);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to sign in." });
  }
}

