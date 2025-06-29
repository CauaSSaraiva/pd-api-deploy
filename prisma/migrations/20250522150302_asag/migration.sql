-- DropForeignKey
ALTER TABLE "alunos" DROP CONSTRAINT "alunos_turmaId_fkey";

-- AlterTable
ALTER TABLE "alunos" ALTER COLUMN "turmaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
