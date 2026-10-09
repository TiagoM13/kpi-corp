-- RenameColumn
ALTER TABLE "invitation" RENAME COLUMN "token" TO "tokenHash";

-- HashExistingTokens
UPDATE "invitation" SET "tokenHash" = encode(sha256(convert_to("tokenHash", 'UTF8')), 'hex');

-- RenameIndex
ALTER INDEX "invitation_token_key" RENAME TO "invitation_tokenHash_key";
