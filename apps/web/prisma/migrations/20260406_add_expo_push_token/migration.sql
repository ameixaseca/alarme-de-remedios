-- Migration: add_expo_push_token
-- Adds type and expoToken fields to PushSubscription, makes endpoint/p256dh/auth nullable

-- Make existing columns nullable
ALTER TABLE "PushSubscription" ALTER COLUMN "endpoint" DROP NOT NULL;
ALTER TABLE "PushSubscription" ALTER COLUMN "p256dh" DROP NOT NULL;
ALTER TABLE "PushSubscription" ALTER COLUMN "auth" DROP NOT NULL;

-- Add new columns
ALTER TABLE "PushSubscription" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'web';
ALTER TABLE "PushSubscription" ADD COLUMN "expoToken" TEXT;
