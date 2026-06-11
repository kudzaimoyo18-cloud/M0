import { pgTable, text, integer, real, boolean, timestamp, primaryKey, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * M0 schema — Postgres (Neon on Vercel).
 *
 * Money is stored in **USD minor units** on `products.price_usd_minor`; orders
 * snapshot the currency-converted amount on each item so totals reconcile if
 * FX moves over the 5–7 day delivery window. v2 takes card payments via Whop
 * (orders.payment_provider = 'whop'); orders.whop_charge_id is the Whop
 * charge id used to match webhook events back to orders.
 */

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),                       // slug, e.g. "women-outerwear"
  parentId: text("parent_id"),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),                     // uuid
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    priceUsdMinor: integer("price_usd_minor").notNull(),
    compareAtUsdMinor: integer("compare_at_usd_minor"),
    status: text("status").notNull().default("draft"),  // 'draft' | 'active' | 'archived'
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUq: uniqueIndex("products_slug_uq").on(t.slug),
    catIdx: index("products_category_idx").on(t.categoryId),
    statusIdx: index("products_status_idx").on(t.status),
  })
);

export const variants = pgTable(
  "variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    size: text("size"),
    color: text("color"),
    inventory: integer("inventory").notNull().default(0),
    priceOverrideUsdMinor: integer("price_override_usd_minor"),
    position: integer("position").notNull().default(0),
  },
  (t) => ({
    skuUq: uniqueIndex("variants_sku_uq").on(t.sku),
    productIdx: index("variants_product_idx").on(t.productId),
  })
);

export const productImages = pgTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),                      // Vercel Blob absolute URL
    blobPath: text("blob_path").notNull(),           // Pathname inside the blob store, for deletion
    alt: text("alt"),
    position: integer("position").notNull().default(0),
  },
  (t) => ({
    productIdx: index("product_images_product_idx").on(t.productId),
  })
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),                     // uuid
    reference: text("reference").notNull(),          // human-readable e.g. "M0-20260517-0042"
    email: text("email").notNull(),
    // Order totals snapshotted in the customer's chosen currency at checkout
    currency: text("currency").notNull(),            // 'USD' | 'ZWG'
    subtotalMinor: integer("subtotal_minor").notNull(),
    shippingMinor: integer("shipping_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull(),
    fxRateFromUsd: real("fx_rate_from_usd").notNull().default(1),
    // Shipping address
    shippingName: text("shipping_name").notNull(),
    shippingPhone: text("shipping_phone").notNull(),
    shippingLine1: text("shipping_line1").notNull(),
    shippingLine2: text("shipping_line2"),
    shippingCity: text("shipping_city").notNull(),
    shippingCountry: text("shipping_country").notNull().default("ZW"),
    paymentProvider: text("payment_provider").notNull().default("whop"),
    whopChargeId: text("whop_charge_id"),
    status: text("status").notNull().default("pending"),  // full lifecycle in src/lib/order-status.ts
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => ({
    refUq: uniqueIndex("orders_reference_uq").on(t.reference),
    emailIdx: index("orders_email_idx").on(t.email),
    statusIdx: index("orders_status_idx").on(t.status),
    whopChargeIdx: index("orders_whop_charge_idx").on(t.whopChargeId),
  })
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    variantId: text("variant_id").notNull(),
    productName: text("product_name").notNull(),
    variantLabel: text("variant_label"),
    qty: integer("qty").notNull(),
    unitPriceMinor: integer("unit_price_minor").notNull(),
    lineTotalMinor: integer("line_total_minor").notNull(),
  },
  (t) => ({
    orderIdx: index("order_items_order_idx").on(t.orderId),
  })
);

// Keep the symbol so legacy imports compile during transition (no-op).
void sql;
void primaryKey;
