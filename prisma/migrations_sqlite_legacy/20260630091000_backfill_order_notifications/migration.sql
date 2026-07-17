INSERT OR IGNORE INTO "Notification" (
  "id", "userId", "orderId", "type", "title", "message", "readAt", "createdAt"
)
SELECT
  lower(hex(randomblob(16))),
  o."customerId",
  o."id",
  'ORDER_' || e."status",
  CASE e."status"
    WHEN 'ACCEPTED' THEN 'Order accepted'
    WHEN 'PREPARING' THEN 'Order being prepared'
    WHEN 'READY_FOR_PICKUP' THEN 'Ready for pickup'
    WHEN 'PICKED_UP' THEN 'Order picked up'
    WHEN 'ON_THE_WAY' THEN 'Rider on the way'
    WHEN 'DELIVERED' THEN 'Order delivered'
    WHEN 'CANCELLED' THEN 'Order cancelled'
    WHEN 'REJECTED' THEN 'Order rejected'
  END,
  CASE e."status"
    WHEN 'ACCEPTED' THEN 'The store accepted your order.'
    WHEN 'PREPARING' THEN 'The store is preparing your items.'
    WHEN 'READY_FOR_PICKUP' THEN 'Your order is ready for a Karame rider.'
    WHEN 'PICKED_UP' THEN 'Your rider collected the order from the store.'
    WHEN 'ON_THE_WAY' THEN 'Your order is travelling to your delivery location.'
    WHEN 'DELIVERED' THEN 'Your Karame Bay delivery is complete.'
    WHEN 'CANCELLED' THEN 'Your order was cancelled.'
    WHEN 'REJECTED' THEN 'The store could not accept your order.'
  END || ' (' || o."orderNumber" || ')',
  NULL,
  e."createdAt"
FROM "OrderStatusEvent" e
JOIN "Order" o ON o."id" = e."orderId"
WHERE e."status" IN (
  'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP',
  'ON_THE_WAY', 'DELIVERED', 'CANCELLED', 'REJECTED'
);
