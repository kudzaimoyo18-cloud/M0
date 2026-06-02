-- Migration 0001 — drop cash-on-delivery from the order payment provider.
--
-- v1 of M0 now coordinates payment via WhatsApp inside the order thread (5–7
-- day delivery window from order confirmation). Cash-on-delivery is no longer
-- offered. The legacy `whatsapp_cod` provider value is rewritten to
-- `whatsapp` so reports and analytics aren't fragmented by the historical
-- variant. Schema default also updated.

ALTER TABLE orders ALTER COLUMN payment_provider SET DEFAULT 'whatsapp';

UPDATE orders SET payment_provider = 'whatsapp' WHERE payment_provider = 'whatsapp_cod';
