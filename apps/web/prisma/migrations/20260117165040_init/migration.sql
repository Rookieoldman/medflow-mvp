-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TECNICO', 'CELADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('NORMAL', 'URGENTE');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('SOLICITADO', 'ASIGNADO', 'EN_CURSO', 'EN_CAMINO_PRUEBA', 'EN_ESPERA', 'EN_LA_PRUEBA', 'VUELTA', 'FINALIZADO', 'PAUSADO');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('PACIENTE_NO_PREPARADO', 'ESPERA_CLINICA', 'PRUEBA_CANCELADA', 'OTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "TransferStatus" NOT NULL DEFAULT 'SOLICITADO',
    "previousStatus" "TransferStatus",
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
