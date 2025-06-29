/*
  Warnings:

  - You are about to drop the `AlunoResponsavel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AlunoResponsavel" DROP CONSTRAINT "AlunoResponsavel_aluno_id_fkey";

-- DropForeignKey
ALTER TABLE "AlunoResponsavel" DROP CONSTRAINT "AlunoResponsavel_responsavel_id_fkey";

-- DropTable
DROP TABLE "AlunoResponsavel";

-- CreateTable
CREATE TABLE "aluno_responsavel" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "responsavel_id" INTEGER NOT NULL,

    CONSTRAINT "aluno_responsavel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "aluno_responsavel" ADD CONSTRAINT "aluno_responsavel_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aluno_responsavel" ADD CONSTRAINT "aluno_responsavel_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "responsaveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
