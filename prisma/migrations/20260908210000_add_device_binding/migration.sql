ALTER TABLE "User" ADD COLUMN "deviceTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "deviceBoundAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_deviceTokenHash_key" ON "User"("deviceTokenHash");
