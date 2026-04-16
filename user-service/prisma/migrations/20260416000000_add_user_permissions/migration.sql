CREATE TABLE IF NOT EXISTS "user_permissions" (
  "user_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id", "permission_id"),
  CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id")
    REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_permissions_user_id_idx" ON "user_permissions"("user_id");
CREATE INDEX IF NOT EXISTS "user_permissions_permission_id_idx" ON "user_permissions"("permission_id");
