-- CreateTable
CREATE TABLE "server_diagnostic_snapshot" (
    "seqid" BIGSERIAL NOT NULL,
    "user_seqid" BIGINT NOT NULL,
    "total_workspaces" INTEGER NOT NULL,
    "total_boards" INTEGER NOT NULL,
    "total_cards" INTEGER NOT NULL,
    "total_card_actions" INTEGER NOT NULL,
    "total_users" INTEGER NOT NULL,
    "total_workspace_members" INTEGER NOT NULL,
    "user_workspaces_owned" INTEGER NOT NULL,
    "user_workspaces_as_member" INTEGER NOT NULL,
    "user_boards_accessible" INTEGER NOT NULL,
    "user_cards_accessible" INTEGER NOT NULL,
    "user_card_actions_accessible" INTEGER NOT NULL,
    "top_workspaces_json" TEXT NOT NULL,
    "recommendations_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_diagnostic_snapshot_pkey" PRIMARY KEY ("seqid")
);

-- CreateIndex
CREATE INDEX "idx_diagnostic_user_seqid" ON "server_diagnostic_snapshot"("user_seqid");

-- CreateIndex
CREATE INDEX "idx_diagnostic_created_at" ON "server_diagnostic_snapshot"("created_at");

-- AddForeignKey
ALTER TABLE "server_diagnostic_snapshot" ADD CONSTRAINT "server_diagnostic_snapshot_user_seqid_fkey" FOREIGN KEY ("user_seqid") REFERENCES "users"("seqid") ON DELETE CASCADE ON UPDATE CASCADE;
