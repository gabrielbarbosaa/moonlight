-- CreateEnum
CREATE TYPE "CancelActor" AS ENUM ('CUSTOMER', 'OWNER');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "cancelNoticeHours" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "manageTokenHash" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledBy" "CancelActor";

-- CreateTable
CREATE TABLE "booking_extras" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_extras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_manageTokenHash_key" ON "bookings"("manageTokenHash");

-- CreateIndex
CREATE INDEX "booking_extras_bookingId_idx" ON "booking_extras"("bookingId");

-- AddForeignKey
ALTER TABLE "booking_extras" ADD CONSTRAINT "booking_extras_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_extras" ADD CONSTRAINT "booking_extras_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "booking_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenants" ADD CONSTRAINT "tenants_cancel_notice_check" CHECK ("cancelNoticeHours" BETWEEN 0 AND 168);

ALTER TABLE "booking_extras" ADD CONSTRAINT "booking_extras_duration_check" CHECK ("durationMinutes" > 0);
