import { shopifyCustomerRequest } from "../../../lib/shopifyCustomer";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimitRedis";

const UPDATE_ADDRESS_MUTATION = `
  mutation customerAddressUpdate($address: MailingAddressInput!, $customerAccessToken: String!, $id: ID!) {
    customerAddressUpdate(address: $address, customerAccessToken: $customerAccessToken, id: $id) {
      customerAddress {
        id
        address1
        address2
        city
        province
        zip
        country
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_ADDRESS_MUTATION = `
  mutation customerAddressCreate($address: MailingAddressInput!, $customerAccessToken: String!) {
    customerAddressCreate(address: $address, customerAccessToken: $customerAccessToken) {
      customerAddress {
        id
        address1
        address2
        city
        province
        zip
        country
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const SET_DEFAULT_ADDRESS_MUTATION = `
  mutation customerDefaultAddressUpdate($addressId: ID!, $customerAccessToken: String!) {
    customerDefaultAddressUpdate(addressId: $addressId, customerAccessToken: $customerAccessToken) {
      customer {
        id
        defaultAddress {
          id
          address1
          city
          province
          zip
          country
        }
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
  const rateOk = await checkRateLimit({ key: `address:${ip}`, windowMs: 60_000, max: 30 });
  if (!rateOk) {
    return res.status(429).json({ message: "Too many requests" });
  }

  const { token, address, addressId, setAsDefault } = req.body || {};

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({ message: "Missing access token" });
  }

  if (!address || typeof address !== 'object') {
    return res.status(400).json({ message: "Address is required" });
  }

  // Validate and sanitize address fields
  const sanitizedAddress = {
    address1: (address.address1 || '').trim().slice(0, 200),
    address2: (address.address2 || '').trim().slice(0, 200),
    city: (address.city || '').trim().slice(0, 100),
    province: (address.province || '').trim().slice(0, 100),
    zip: (address.zip || '').trim().slice(0, 20),
    country: (address.country || '').trim().slice(0, 100),
    firstName: (address.firstName || '').trim().slice(0, 100),
    lastName: (address.lastName || '').trim().slice(0, 100),
    phone: (address.phone || '').trim().slice(0, 50),
  };

  if (!sanitizedAddress.address1 || !sanitizedAddress.city || !sanitizedAddress.country) {
    return res.status(400).json({ message: "Address fields are required" });
  }

  const sanitizedToken = token.trim().slice(0, 500);

  try {
    let result;

    if (addressId) {
      // Validate addressId format
      const sanitizedAddressId = typeof addressId === 'string' ? addressId.trim().slice(0, 500) : null;
      if (!sanitizedAddressId || !sanitizedAddressId.startsWith('gid://shopify/MailingAddress/')) {
        return res.status(400).json({ message: "Invalid address ID" });
      }

      // Update existing address
      result = await shopifyCustomerRequest(UPDATE_ADDRESS_MUTATION, {
        address: sanitizedAddress,
        customerAccessToken: sanitizedToken,
        id: sanitizedAddressId,
      });

      if (result.customerAddressUpdate?.userErrors?.length > 0) {
        return res.status(400).json({
          message: result.customerAddressUpdate.userErrors[0].message || "Failed to update address",
        });
      }
    } else {
      // Create new address
      result = await shopifyCustomerRequest(CREATE_ADDRESS_MUTATION, {
        address: sanitizedAddress,
        customerAccessToken: sanitizedToken,
      });

      if (result.customerAddressCreate?.userErrors?.length > 0) {
        return res.status(400).json({
          message: result.customerAddressCreate.userErrors[0].message || "Failed to create address",
        });
      }

      // If creating new address and setAsDefault is true, set it as default
      if (setAsDefault && result.customerAddressCreate?.customerAddress?.id) {
        await shopifyCustomerRequest(SET_DEFAULT_ADDRESS_MUTATION, {
          addressId: result.customerAddressCreate.customerAddress.id,
          customerAccessToken: sanitizedToken,
        });
      }
    }

    // If updating existing address and setAsDefault is true, set it as default
    if (setAsDefault && addressId) {
      const sanitizedAddressId = typeof addressId === 'string' ? addressId.trim().slice(0, 500) : null;
      if (sanitizedAddressId) {
        await shopifyCustomerRequest(SET_DEFAULT_ADDRESS_MUTATION, {
          addressId: sanitizedAddressId,
          customerAccessToken: sanitizedToken,
        });
      }
    }

    return res.status(200).json({
      success: true,
      address: addressId ? result.customerAddressUpdate?.customerAddress : result.customerAddressCreate?.customerAddress,
    });
  } catch (error) {
    console.error("Address update error:", error);
    return res.status(500).json({ message: "Unable to update address. Please try again later." });
  }
}

