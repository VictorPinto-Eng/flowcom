-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "user_seqid" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_user_seqid_idx" ON "session"("user_seqid");

-- CreateIndex
CREATE INDEX "session_expires_at_idx" ON "session"("expires_at");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_seqid_fkey" FOREIGN KEY ("user_seqid") REFERENCES "users"("seqid") ON DELETE CASCADE ON UPDATE CASCADE;
