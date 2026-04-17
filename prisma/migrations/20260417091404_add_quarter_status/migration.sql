-- CreateEnum
CREATE TYPE "QuarterStatus" AS ENUM ('ACTIVE', 'UPCOMING', 'ARCHIVED');

-- AlterTable: replace isActive boolean with QuarterStatus enum
ALTER TABLE "Quarter" ADD COLUMN "status" "QuarterStatus" NOT NULL DEFAULT 'UPCOMING';
ALTER TABLE "Quarter" DROP COLUMN "isActive";
