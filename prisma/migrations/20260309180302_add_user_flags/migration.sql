-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isContractor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTeamLead" BOOLEAN NOT NULL DEFAULT false;
