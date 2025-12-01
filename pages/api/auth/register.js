import { shopifyCustomerRequest } from "../../../lib/shopifyCustomer";

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

  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  try {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return res.status(400).json({ message: "Please enter a valid name." });
    }

    const [firstName, ...rest] = normalizedName.split(/\s+/);
    const lastName = rest.join(" ") || null;

    const createResult = await shopifyCustomerRequest(CREATE_MUTATION, {
      input: {
        email,
        password,
        acceptsMarketing: false,
        firstName,
        lastName,
      },
    });

    if (createResult.customerCreate?.customerUserErrors?.length) {
      return res.status(400).json({ message: createResult.customerCreate.customerUserErrors[0].message });
    }

    const tokenResult = await shopifyCustomerRequest(TOKEN_MUTATION, {
      input: { email, password },
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

