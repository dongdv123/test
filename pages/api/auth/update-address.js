import { shopifyCustomerRequest } from "../../../lib/shopifyCustomer";

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

  const { token, address, addressId, setAsDefault } = req.body || {};

  if (!token) {
    return res.status(400).json({ message: "Missing access token" });
  }

  if (!address || !address.address1 || !address.city || !address.country) {
    return res.status(400).json({ message: "Address fields are required" });
  }

  try {
    let result;

    if (addressId) {
      // Update existing address
      result = await shopifyCustomerRequest(UPDATE_ADDRESS_MUTATION, {
        address,
        customerAccessToken: token,
        id: addressId,
      });

      if (result.customerAddressUpdate?.userErrors?.length > 0) {
        return res.status(400).json({
          message: result.customerAddressUpdate.userErrors[0].message || "Failed to update address",
        });
      }
    } else {
      // Create new address
      result = await shopifyCustomerRequest(CREATE_ADDRESS_MUTATION, {
        address,
        customerAccessToken: token,
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
          customerAccessToken: token,
        });
      }
    }

    // If updating existing address and setAsDefault is true, set it as default
    if (setAsDefault && addressId) {
      await shopifyCustomerRequest(SET_DEFAULT_ADDRESS_MUTATION, {
        addressId,
        customerAccessToken: token,
      });
    }

    return res.status(200).json({
      success: true,
      address: addressId ? result.customerAddressUpdate?.customerAddress : result.customerAddressCreate?.customerAddress,
    });
  } catch (error) {
    console.error("Address update error:", error);
    return res.status(500).json({ message: error.message || "Unable to update address" });
  }
}

