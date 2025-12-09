import { getInstallmentPricing } from "../../lib/shopifyInstallments";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { variantId, quantity = 1 } = req.body;

  if (!variantId || typeof variantId !== "string") {
    return res.status(400).json({ error: "variantId is required and must be a string" });
  }

  const validQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

  try {
    const pricingData = await getInstallmentPricing(variantId, validQuantity);
    return res.status(200).json({ data: pricingData });
  } catch (error) {
    console.error("Installment pricing API error:", error);
    return res.status(500).json({ error: "Failed to fetch installment pricing" });
  }
}

