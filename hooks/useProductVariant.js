import { useState, useMemo, useEffect, useCallback } from "react";

/**
 * Custom hook for managing product variant selection
 * Handles variant options, quantity, and active variant calculation
 */
export const useProductVariant = (product) => {
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const defaults = {};
    product?.options?.forEach((option) => {
      if (option.values?.length) defaults[option.name] = option.values[0];
    });
    return defaults;
  });

  const [quantity, setQuantity] = useState(1);

  // Calculate active variant based on selected options
  const activeVariant = useMemo(() => {
    if (!product?.variants) return null;
    return (
      product.variants.find((variant) =>
        (variant.selectedOptions || []).every(
          (opt) => selectedOptions[opt.name] === opt.value,
        ),
      ) || product.variants[0]
    );
  }, [product?.variants, selectedOptions]);

  // Update quantity when variant changes (reset to 1)
  useEffect(() => {
    setQuantity(1);
  }, [activeVariant?.id]);

  const updateOption = useCallback((optionName, value) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  }, []);

  const incrementQuantity = useCallback(() => {
    setQuantity((prev) => prev + 1);
  }, []);

  const decrementQuantity = useCallback(() => {
    setQuantity((prev) => Math.max(1, prev - 1));
  }, []);

  const setQuantityValue = useCallback((value) => {
    setQuantity(Math.max(1, Number(value) || 1));
  }, []);

  return {
    selectedOptions,
    setSelectedOptions,
    updateOption,
    quantity,
    setQuantity,
    incrementQuantity,
    decrementQuantity,
    setQuantityValue,
    activeVariant,
  };
};

