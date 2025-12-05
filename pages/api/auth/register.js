import { shopifyCustomerRequest } from "../../../lib/shopifyCustomer";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";
import crypto from "crypto";

const CREATE_MUTATION = `
  mutation registerCustomer($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
      }
      customerUserErrors {
        field
        message
      }
    }
  }
`;

const TOKEN_MUTATION = `
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
  if (!checkRateLimit({ key: `register:${ip}`, windowMs: 60_000, max: 10 })) {
    return res.status(429).json({ message: "Too many attempts. Please wait and try again." });
  }

  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  try {
    // Validate name
    const normalizedName = name.trim();
    if (!normalizedName) {
      return res.status(400).json({ message: "Please enter a valid name." });
    }
    if (normalizedName.length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters long." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    // Validate password strength before creating customer
    const trimmedPassword = password.trim();
    if (trimmedPassword.length < 8) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters long." 
      });
    }

    const [firstName, ...rest] = normalizedName.split(/\s+/);
    const lastName = rest.join(" ") || null;

    // Create customer with the validated password
    const createResult = await shopifyCustomerRequest(CREATE_MUTATION, {
      input: {
        email: trimmedEmail,
        password: trimmedPassword,
        acceptsMarketing: false,
        firstName,
        lastName,
      },
    });

    if (createResult.customerCreate?.customerUserErrors?.length) {
      return res.status(400).json({ message: createResult.customerCreate.customerUserErrors[0].message });
    }

    // Use the same password to create token (must match what was used to create customer)
    const tokenResult = await shopifyCustomerRequest(TOKEN_MUTATION, {
      input: { email: trimmedEmail, password: trimmedPassword },
    });

    const tokenData = tokenResult.customerAccessTokenCreate;
    if (tokenData.userErrors?.length) {
      return res.status(200).json({ registered: true, message: tokenData.userErrors[0].message });
    }

    return res.status(200).json({ registered: true, token: tokenData.customerAccessToken });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to register." });
  }
}

