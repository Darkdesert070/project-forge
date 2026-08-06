-- Project FORGE — opt-in public organisation profile
--
-- Adds two columns to Workspace. Both default to a private, empty state, so
-- every existing workspace and every workspace created afterwards stays
-- invisible to the public directory until an administrator opts in.

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
                        ADD COLUMN "tagline" TEXT NOT NULL DEFAULT '';

-- CreateIndex
-- Supports the directory name search without scanning the table.
CREATE INDEX "Workspace_isPublic_idx" ON "Workspace"("isPublic");
