-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "lastReminderAt" TIMESTAMP(3);
