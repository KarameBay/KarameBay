CREATE TABLE IF NOT EXISTS "EmailNotificationLog" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "notificationId" TEXT,
  "userId" TEXT,
  "orderId" TEXT,
  "recipientEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'EMAIL',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" DATETIME,
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "EmailNotificationLog_userId_createdAt_idx"
  ON "EmailNotificationLog"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "EmailNotificationLog_orderId_createdAt_idx"
  ON "EmailNotificationLog"("orderId", "createdAt");

CREATE INDEX IF NOT EXISTS "EmailNotificationLog_status_createdAt_idx"
  ON "EmailNotificationLog"("status", "createdAt");
