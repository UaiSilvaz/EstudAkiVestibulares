ALTER TABLE "Product" ADD COLUMN "abacateProductId" TEXT;
CREATE UNIQUE INDEX "Product_abacateProductId_key" ON "Product"("abacateProductId");
CREATE TABLE "CheckoutOrder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "providerCheckoutId" TEXT,
  "checkoutUrl" TEXT,
  "amountCents" INTEGER NOT NULL,
  "items" JSONB NOT NULL,
  "method" TEXT NOT NULL,
  "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "devMode" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CheckoutOrder_providerCheckoutId_key" ON "CheckoutOrder"("providerCheckoutId");
CREATE INDEX "CheckoutOrder_userId_status_createdAt_idx" ON "CheckoutOrder"("userId", "status", "createdAt");
ALTER TABLE "CheckoutOrder" ADD CONSTRAINT "CheckoutOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaymentWebhookEvent_orderId_idx" ON "PaymentWebhookEvent"("orderId");
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CheckoutOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
