import { requestShopifyStorefrontDirect } from "./shopify";
import { formatPrice } from "./productFormatter";

/**
 * Get Shop Pay installment pricing for a product variant
 * @param {string} variantId - Product variant ID
 * @param {number} quantity - Quantity (default: 1)
 * @returns {Promise<Object|null>} Installment pricing data or null
 */
export async function getInstallmentPricing(variantId, quantity = 1) {
  if (!variantId) {
    return null;
  }

  const query = `
    query getInstallmentPricing($variantId: ID!, $quantity: Int!) {
      shopPayInstallmentsPricing(
        variantId: $variantId
        quantity: $quantity
      ) {
        installmentOptions {
          installmentCount
          installmentAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
        }
      }
    }
  `;

  try {
    const data = await requestShopifyStorefrontDirect(query, {
      variantId,
      quantity: Math.max(1, Math.floor(quantity)),
    });

    if (!data?.shopPayInstallmentsPricing) {
      return null;
    }

    return data.shopPayInstallmentsPricing;
  } catch (error) {
    return null;
  }
}

/**
 * Format installment option for display
 * @param {Object} option - Installment option
 * @returns {Object} Formatted option
 */
export function formatInstallmentOption(option) {
  if (!option || !option.installmentAmount || !option.totalAmount) {
    return null;
  }

  const installmentAmount = Number(option.installmentAmount.amount || 0);
  const totalAmount = Number(option.totalAmount.amount || 0);
  const currencyCode = option.installmentAmount.currencyCode || option.totalAmount.currencyCode || "USD";
  const count = Number(option.installmentCount || 0);

  // Validate data
  if (!Number.isFinite(installmentAmount) || !Number.isFinite(totalAmount) || count <= 0) {
    return null;
  }

  return {
    count,
    installmentAmount,
    totalAmount,
    currencyCode,
    formattedInstallment: formatPrice(installmentAmount, currencyCode),
    formattedTotal: formatPrice(totalAmount, currencyCode),
  };
}

/**
 * Get best installment option (usually 4 payments)
 * @param {Object} pricingData - Installment pricing data
 * @returns {Object|null} Best installment option
 */
export function getBestInstallmentOption(pricingData) {
  if (!pricingData?.installmentOptions || pricingData.installmentOptions.length === 0) {
    return null;
  }

  // Prefer 4 payments, otherwise return first available
  const fourPayments = pricingData.installmentOptions.find(opt => opt.installmentCount === 4);
  if (fourPayments) {
    return formatInstallmentOption(fourPayments);
  }

  return formatInstallmentOption(pricingData.installmentOptions[0]);
}

