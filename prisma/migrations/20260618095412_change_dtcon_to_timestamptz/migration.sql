-- AlterTable: change dtcon from DATE to TIMESTAMPTZ(6)
ALTER TABLE "card" ALTER COLUMN "dtcon" TYPE TIMESTAMPTZ(6) USING "dtcon"::TIMESTAMPTZ(6);
