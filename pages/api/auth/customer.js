import { shopifyCustomerRequest } from "../../../lib/shopifyCustomer";

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

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ message: "Missing access token" });
  }

  try {
    const data = await shopifyCustomerRequest(QUERY, { token });
    if (!data.customer) {
      return res.status(401).json({ message: "Invalid or expired access token" });
    }
    return res.status(200).json(data.customer);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to load customer profile" });
  }
}

