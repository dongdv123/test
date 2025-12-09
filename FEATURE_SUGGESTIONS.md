# Feature Suggestions Based on Unused APIs

Dựa trên các API permissions chưa được sử dụng, đây là các tính năng có thể thêm vào website:

## 1. 📄 **Content Management System (CMS)** 
**API**: `unauthenticated_read_content`

### Tính năng đề xuất:
- **Blog/Articles Section**: Hiển thị blog posts từ Shopify
- **About Us Page**: Dynamic content từ Shopify Pages
- **FAQ Page**: Tự động sync từ Shopify Pages
- **Help Center**: Tích hợp Shopify Help Center content

### Implementation:
```javascript
// lib/shopifyContent.js
export async function fetchShopifyPages() {
  const query = `
    query {
      pages(first: 50) {
        edges {
          node {
            id
            title
            handle
            body
            bodySummary
            createdAt
            updatedAt
          }
        }
      }
    }
  `;
  // ...
}

export async function fetchShopifyArticles() {
  const query = `
    query {
      articles(first: 50) {
        edges {
          node {
            id
            title
            handle
            excerpt
            content
            publishedAt
            author {
              name
            }
          }
        }
      }
    }
  `;
  // ...
}
```

### Pages cần tạo:
- `/blog` - Blog listing page
- `/blog/[handle]` - Blog post detail
- `/pages/[handle]` - Dynamic page content
- `/about` - About us page
- `/faq` - FAQ page

---

## 2. 💳 **Dynamic Installment Pricing**
**API**: `unauthenticated_read_shop_pay_installments_pricing`

### Tính năng đề xuất:
- **Dynamic Installment Calculator**: Tính toán installment pricing thực tế từ Shopify
- **Multiple Payment Options**: Hiển thị các phương thức thanh toán trả góp
- **Real-time Pricing**: Cập nhật giá theo variant và quantity

### Implementation:
```javascript
// lib/shopifyInstallments.js
export async function getInstallmentPricing(variantId, quantity = 1) {
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
  // ...
}
```

### UI Enhancement:
- Thay thế hardcoded "4 interest-free payments" bằng dynamic pricing
- Hiển thị multiple installment options (3, 4, 6, 12 months)
- Calculator trên product page và cart

---

## 3. 📦 **Buy Online Pickup In Store (BOPIS)** ❌ Đã Xóa
**API**: `unauthenticated_read_product_pickup_locations`

**Trạng thái:** ❌ **Đã xóa hoàn toàn** - Không có cửa hàng vật lý, chỉ ship online

**Lý do xóa:** Giảm code size, không cần thiết cho business model hiện tại

**Files đã xóa:**
- `lib/shopifyPickup.js`
- `pages/api/pickup-locations.js`
- `pages/store-locator.js`
- `styles/store-locator.css`
- `docs/STORE_LOCATOR_BENEFITS.md`
- `docs/STORE_LOCATOR_USAGE.md`

---

## 4. 🔄 **Subscription/Recurring Orders**
**API**: `unauthenticated_read_selling_plans`

### Tính năng đề xuất:
- **Subscribe & Save**: Cho phép khách hàng đăng ký nhận hàng định kỳ
- **Flexible Plans**: Multiple subscription options (weekly, monthly, quarterly)
- **Discount for Subscriptions**: Giảm giá cho khách hàng đăng ký
- **Manage Subscriptions**: Dashboard để quản lý subscriptions

### Implementation:
```javascript
// lib/shopifySellingPlans.js
export async function getSellingPlans(productId) {
  const query = `
    query getSellingPlans($productId: ID!) {
      product(id: $productId) {
        sellingPlanGroups {
          sellingPlans {
            id
            name
            description
            options {
              name
              value
            }
            priceAdjustments {
              adjustmentValue {
                ... on SellingPlanFixedAmountPriceAdjustment {
                  adjustmentAmount {
                    amount
                    currencyCode
                  }
                }
                ... on SellingPlanFixedPriceAdjustment {
                  price {
                    amount
                    currencyCode
                  }
                }
                ... on SellingPlanPercentagePriceAdjustment {
                  adjustmentPercentage
                }
              }
            }
            billingPolicy {
              ... on SellingPlanRecurringBillingPolicy {
                interval
                intervalCount
              }
            }
          }
        }
      }
    }
  `;
  // ...
}
```

### UI Features:
- "Subscribe & Save" button trên product page
- Subscription selector với pricing comparison
- Subscription management trong customer account
- Email reminders trước khi charge

---

## 5. 🏷️ **Customer Segmentation & Personalization**
**API**: `unauthenticated_read_customer_tags`

### Tính năng đề xuất:
- **Personalized Recommendations**: Gợi ý sản phẩm dựa trên customer tags
- **VIP Customer Benefits**: Ưu đãi đặc biệt cho VIP customers
- **Segmented Marketing**: Hiển thị content khác nhau cho từng segment
- **Loyalty Program**: Tích hợp với customer tags để track loyalty

### Implementation:
```javascript
// lib/shopifyCustomerTags.js
export async function getCustomerTags(customerAccessToken) {
  const query = `
    query getCustomer($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        tags
      }
    }
  `;
  // ...
}

// Personalized product recommendations based on tags
export function getPersonalizedProducts(customerTags, allProducts) {
  return allProducts.filter(product => {
    return product.tags.some(tag => 
      customerTags.includes(tag.toLowerCase())
    );
  });
}
```

### UI Features:
- Personalized homepage sections
- VIP-only product access
- Special pricing for tagged customers
- Customized email campaigns

---

## 6. 📊 **Bulk Operations Dashboard**
**API**: `unauthenticated_read_bulk_operations`, `unauthenticated_write_bulk_operations`

### Tính năng đề xuất:
- **Admin Dashboard**: Quản lý bulk operations từ frontend
- **Bulk Product Updates**: Update nhiều products cùng lúc
- **Inventory Sync**: Đồng bộ inventory từ external systems
- **Bulk Import/Export**: Import/export products, customers, orders

### Implementation:
```javascript
// lib/shopifyBulkOperations.js
export async function createBulkOperation(query, variables) {
  const mutation = `
    mutation bulkOperationRunMutation($query: String!) {
      bulkOperationRunMutation(query: $query) {
        bulkOperation {
          id
          status
          errorCode
          createdAt
          completedAt
          objectCount
          fileSize
          url
          partialDataUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  // ...
}

export async function getBulkOperationStatus(operationId) {
  const query = `
    query getBulkOperation($id: ID!) {
      node(id: $id) {
        ... on BulkOperation {
          id
          status
          errorCode
          createdAt
          completedAt
          objectCount
          fileSize
          url
          partialDataUrl
        }
      }
    }
  `;
  // ...
}
```

### Pages cần tạo:
- `/admin/bulk-operations` - Bulk operations dashboard (protected)
- `/admin/products/bulk-edit` - Bulk product editor
- `/admin/inventory/sync` - Inventory sync tool

---

## 7. 🎨 **Custom Content Types (Metaobjects)**
**API**: `unauthenticated_read_metaobjects`

### Tính năng đề xuất:
- **Custom Product Fields**: Thêm custom fields cho products (dimensions, care instructions, etc.)
- **Brand Pages**: Dynamic brand pages từ metaobjects
- **Product Comparisons**: So sánh sản phẩm với custom attributes
- **Rich Product Data**: Hiển thị thông tin chi tiết từ metaobjects

### Implementation:
```javascript
// lib/shopifyMetaobjects.js
export async function getMetaobjects(type, limit = 50) {
  const query = `
    query getMetaobjects($type: String!, $first: Int!) {
      metaobjects(type: $type, first: $first) {
        edges {
          node {
            id
            type
            fields {
              key
              value
              type
            }
          }
        }
      }
    }
  `;
  // ...
}

// Example: Get product care instructions
export async function getProductCareInstructions(productHandle) {
  const metaobjects = await getMetaobjects('product_care_instructions');
  return metaobjects.find(m => m.productHandle === productHandle);
}
```

### Use Cases:
- Product care instructions
- Size guides
- Material information
- Brand stories
- Product comparisons

---

## Priority Recommendations

### High Priority (Quick Wins):
1. ✅ **Dynamic Installment Pricing** - Đã implement và hoạt động
2. **Content Management (Blog/Pages)** - Tăng SEO và engagement (đã bỏ qua theo yêu cầu)
3. ❌ **Buy Online Pickup In Store** - Đã xóa (không có cửa hàng vật lý)

### Medium Priority:
4. **Subscription/Recurring Orders** - Tăng recurring revenue
5. **Customer Segmentation** - Cải thiện personalization

### Low Priority (Admin Features):
6. **Bulk Operations** - Cần admin authentication, phức tạp hơn
7. **Metaobjects** - Cần setup trong Shopify admin trước

---

## Implementation Roadmap

### Phase 1 (1-2 weeks):
- ✅ Dynamic Installment Pricing - **Đã hoàn thành**

### Phase 2 (2-3 weeks):
- ❌ BOPIS (Store Locator + Pickup Option) - **Đã xóa**
- Customer Segmentation basics

### Phase 3 (3-4 weeks):
- ✅ Subscription/Recurring Orders
- ✅ Advanced Metaobjects integration

### Phase 4 (Future):
- ✅ Bulk Operations Dashboard (Admin only)
- ✅ Advanced Customer Segmentation

