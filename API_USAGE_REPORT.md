# Shopify Storefront API Usage Report

## APIs Currently Used ✅

### 1. **unauthenticated_read_checkouts** ✅
- **Usage**: Cart queries (`CART_QUERY` in `lib/shopify.js`)
- **Location**: `lib/shopify.js` - `getCart()` function
- **Status**: **REQUIRED** - Used for reading cart data

### 2. **unauthenticated_write_checkouts** ✅
- **Usage**: Cart mutations (`cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`)
- **Location**: `lib/shopify.js` - Cart operations
- **Status**: **REQUIRED** - Used for cart management

### 3. **unauthenticated_read_product_tags** ✅
- **Usage**: Product tags reading (`fetchAllProductTags`, product queries include tags)
- **Location**: `lib/shopify.js`, `pages/index.js`, `pages/products/[handle].js`
- **Status**: **REQUIRED** - Used extensively for filtering and categorization

### 4. **unauthenticated_read_product_inventory** ✅
- **Usage**: Product variant inventory (`inventoryQuantity` field)
- **Location**: `pages/products/[handle].js` - Stock warnings
- **Status**: **REQUIRED** - Used for stock display

### 5. **unauthenticated_read_bundles** ✅
- **Usage**: Bundle operations (`pages/api/build-bundle.js`)
- **Location**: `pages/api/build-bundle.js`
- **Status**: **REQUIRED** - Used for bundle builder feature

### 6. **unauthenticated_read_customers** ✅
- **Usage**: Customer reading operations
- **Location**: `lib/shopifyCustomer.js`, `pages/api/auth/customer.js`
- **Status**: **REQUIRED** - Used for customer profile

### 7. **unauthenticated_write_customers** ✅
- **Usage**: Customer creation (`customerCreate` mutation)
- **Location**: `pages/api/auth/register.js`
- **Status**: **REQUIRED** - Used for user registration

### 8. **unauthenticated_read_product_listings** ✅
- **Usage**: Product queries (implicitly used via `products` query)
- **Location**: `lib/shopify.js` - All product queries
- **Status**: **REQUIRED** - Used for product listings

## APIs NOT Currently Used ❌

### 1. **unauthenticated_read_content** ❌
- **Status**: **NOT USED** - Can be removed if not planning to use Shopify Pages/Articles
- **Recommendation**: Remove if not needed

### 2. **unauthenticated_read_shop_pay_installments_pricing** ❌
- **Status**: **NOT USED** - Installments are hardcoded in UI
- **Location**: `pages/products/[handle].js` - Hardcoded "4 interest-free payments"
- **Recommendation**: Remove or implement actual API call

### 3. **unauthenticated_read_bulk_operations** ❌
- **Status**: **NOT USED**
- **Recommendation**: **REMOVE** - Not needed for current functionality

### 4. **unauthenticated_write_bulk_operations** ❌
- **Status**: **NOT USED**
- **Recommendation**: **REMOVE** - Not needed for current functionality

### 5. **unauthenticated_read_selling_plans** ❌
- **Status**: **NOT USED**
- **Recommendation**: **REMOVE** - Not needed for current functionality

### 6. **unauthenticated_read_metaobjects** ❌
- **Status**: **NOT USED**
- **Recommendation**: **REMOVE** - Not needed for current functionality

### 7. **unauthenticated_read_product_pickup_locations** ❌
- **Status**: **NOT USED** - Feature đã được implement nhưng đã xóa hoàn toàn
- **Recommendation**: **REMOVE** - Không có cửa hàng vật lý, chỉ ship online

### 8. **unauthenticated_read_customer_tags** ❌
- **Status**: **NOT USED**
- **Recommendation**: **REMOVE** - Not needed for current functionality

## Summary

### Required APIs (8):
- ✅ unauthenticated_read_checkouts
- ✅ unauthenticated_write_checkouts
- ✅ unauthenticated_read_product_tags
- ✅ unauthenticated_read_product_inventory
- ✅ unauthenticated_read_bundles
- ✅ unauthenticated_read_customers
- ✅ unauthenticated_write_customers
- ✅ unauthenticated_read_product_listings

### Can Be Removed (8):
- ❌ unauthenticated_read_content
- ❌ unauthenticated_read_shop_pay_installments_pricing (or implement properly)
- ❌ unauthenticated_read_bulk_operations
- ❌ unauthenticated_write_bulk_operations
- ❌ unauthenticated_read_selling_plans
- ❌ unauthenticated_read_metaobjects
- ❌ unauthenticated_read_product_pickup_locations
- ❌ unauthenticated_read_customer_tags

## Recommendations

1. **Remove unused API permissions** to improve security posture
2. **Consider implementing** `unauthenticated_read_shop_pay_installments_pricing` if you want dynamic installment pricing
3. **Consider implementing** `unauthenticated_read_content` if you plan to use Shopify Pages/Articles/Blog

