-- 1️⃣ Añadir columna como nullable
ALTER TABLE "User"
ADD COLUMN "password" TEXT;

-- 2️⃣ Rellenar password para usuarios existentes
-- password = "1234" hasheada con bcrypt
UPDATE "User"
SET "password" = '$2a$10$9m8r2M7QX6s0K0g9w2Jmhe6d6u6Yp3ZyZy0Q6nK5bQZkPp8mW'
WHERE "password" IS NULL;

-- 3️⃣ Hacerla obligatoria
ALTER TABLE "User"
ALTER COLUMN "password" SET NOT NULL;