-- Project FORGE — opt-in public organisation profile

ALTER TABLE "Workspace" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
                        ADD COLUMN "tagline" TEXT NOT NULL DEFAULT '';

CREATE INDEX "Workspace_isPublic_idx" ON "Workspace"("isPublic");