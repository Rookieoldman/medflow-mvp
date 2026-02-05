-- 1. Crear el enum si no existe
DO $$ BEGIN
  CREATE TYPE "TestType" AS ENUM ('RX', 'TAC', 'RM', 'ECO', 'OTRO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Añadir columna temporal (NULLABLE)
ALTER TABLE "Transfer"
ADD COLUMN "testType_new" "TestType";

-- 3. Migrar TODOS los registros existentes
UPDATE "Transfer"
SET "testType_new" = 'RX'
WHERE "testType_new" IS NULL;

-- 4. Asegurarnos de que no queda ningún NULL
UPDATE "Transfer"
SET "testType_new" = 'RX'
WHERE "testType_new" IS NULL;

-- 5. Eliminar columna antigua
ALTER TABLE "Transfer" DROP COLUMN "testType";

-- 6. Renombrar la nueva
ALTER TABLE "Transfer"
RENAME COLUMN "testType_new" TO "testType";

-- 7. Ahora sí, forzar NOT NULL
ALTER TABLE "Transfer"
ALTER COLUMN "testType" SET NOT NULL;