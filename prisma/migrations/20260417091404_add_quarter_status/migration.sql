-- CreateEnum
CREATE TYPE "QuarterStatus" AS ENUM ('ACTIVE', 'UPCOMING', 'ARCHIVED');

-- AlterTable: replace isActive boolean with QuarterStatus enum
ALTER TABLE "Quarter" ADD COLUMN "status" "QuarterStatus" NOT NULL DEFAULT 'UPCOMING';
UPDATE "Quarter" SET "status" = 'ACTIVE' WHERE "isActive" = true;
UPDATE "Quarter" SET "status" = 'ARCHIVED' WHERE "isActive" = false;
ALTER TABLE "Quarter" DROP COLUMN "isActive";
