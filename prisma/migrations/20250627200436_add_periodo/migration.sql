/*
  Warnings:

  - A unique constraint covering the columns `[professor_turma_id,data,periodo]` on the table `aulas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `periodo` to the `aulas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "aulas" ADD COLUMN     "periodo" VARCHAR(65) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "aulas_professor_turma_id_data_periodo_key" ON "aulas"("professor_turma_id", "data", "periodo");
