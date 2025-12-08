import { shopifyCustomerRequest } from "../../../lib/shopifyCustomer";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimitRedis";

const QUERY = `
  query getCustomer($token: String!) {
    customer(customerAccessToken: $token) {
      id
      email
      displayName
      firstName
      lastName
      phone
      createdAt
      defaultAddress {
        id
        address1
        address2
        city
        province
        zip
        country
      }
      orders(first: 10, reverse: true) {
        edges {
          node {
            id
            name
            processedAt
            financialStatus
            fulfillmentStatus
            totalPriceV2 {
              amount
              currencyCode
            }
            lineItems(first: 5) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
          }
        }
      }
    }
  }
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const ip = getClientIp(req);
  const rateOk = await checkRateLimit({ key: `customer:${ip}`, windowMs: 60_000, max: 60 });
  if (!rateOk) {
    return res.status(429).json({ message: "Too many requests" });
  }

  const { token } = req.body || {};
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({ message: "Missing access token" });
  }
  
  // Sanitize token - only allow alphanumeric and some special chars
  const sanitizedToken = token.trim().slice(0, 500);

  try {
    const data = await shopifyCustomerRequest(QUERY, { token: sanitizedToken });
    if (!data.customer) {
      return res.status(401).json({ message: "Invalid or expired access token" });
    }
    return res.status(200).json(data.customer);
  } catch (error) {
    console.error("Customer profile error:", error);
    return res.status(500).json({ message: "Unable to load customer profile. Please try again later." });
  }
}

