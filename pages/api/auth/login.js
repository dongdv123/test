import { shopifyCustomerRequest } from "../../../lib/shopifyCustomer";

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

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const data = await shopifyCustomerRequest(MUTATION, {
      input: { email, password },
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

