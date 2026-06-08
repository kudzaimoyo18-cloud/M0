-- Migration 0002 — switch payment processing to Whop, drop WhatsApp+COD.
--
-- v2: every order goes through Whop hosted checkout. The order is created in
-- 'pending' status with payment_provider = 'whop', the customer is redirected
-- to Whop's checkout URL, and the Whop webhook flips status → 'paid' on
-- charge.succeeded. wa.me is no longer involved in the buy flow.
--
-- whop_charge_id is the Whop charge ID we get back from POST /api/v5/charges
-- and use to look up the order when the webhook fires.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS whop_charge_id text;

CREATE INDEX IF NOT EXISTS orders_whop_charge_idx ON orders (whop_charge_id);

ALTER TABLE orders ALTER COLUMN payment_provider SET DEFAULT 'whop';
