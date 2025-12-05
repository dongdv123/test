import { shopifyCustomerRequest } from "../../../lib/shopifyCustomer";
import crypto from "crypto";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";

const CREATE_CUSTOMER_MUTATION = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        acceptsMarketing
      }
      customerUserErrors {
        field
        message
      }
    }
  }
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit({ key: `newsletter:${ip}`, windowMs: 60_000, max: 20 })) {
    return res.status(429).json({ message: "Too many requests" });
  }

  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ message: "Email is required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    // Create new customer with acceptsMarketing = true
    // If customer already exists, Shopify will return an error which we'll handle
    const strongPassword = `${crypto.randomBytes(24).toString("base64url")}A1!`;
    const createResult = await shopifyCustomerRequest(CREATE_CUSTOMER_MUTATION, {
      input: {
        email: email.trim(),
        acceptsMarketing: true,
        // Create a strong random password - customer can reset it later if needed
        password: strongPassword,
      },
    });

    if (createResult.customerCreate?.customerUserErrors?.length) {
      const error = createResult.customerCreate.customerUserErrors[0];
      
      // If email already exists, we'll treat it as success (they might already be subscribed)
      if (error.message.includes("taken") || error.message.includes("already exists")) {
        return res.status(200).json({ 
          message: "Thank you! If you're not already subscribed, you'll receive our emails soon.",
          subscribed: true 
        });
      }
      
      return res.status(400).json({ 
        message: error.message || "Failed to subscribe. Please try again." 
      });
    }

    return res.status(200).json({ 
      message: "Successfully subscribed to emails!",
      subscribed: true 
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return res.status(500).json({ 
      message: "Something went wrong. Please try again later." 
    });
  }
}

