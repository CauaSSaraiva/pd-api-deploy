-- AlterTable
ALTER TABLE "alunos" ADD COLUMN     "precisaTrocarSenha" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "professores" ADD COLUMN     "precisaTrocarSenha" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "responsaveis" ADD COLUMN     "precisaTrocarSenha" BOOLEAN NOT NULL DEFAULT true;
