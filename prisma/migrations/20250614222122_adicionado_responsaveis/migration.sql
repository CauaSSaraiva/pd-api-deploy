-- CreateTable
CREATE TABLE "responsaveis" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(75) NOT NULL,
    "senha_hash" VARCHAR(65),
    "expo_push_token" VARCHAR(255),

    CONSTRAINT "responsaveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlunoResponsavel" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "responsavel_id" INTEGER NOT NULL,

    CONSTRAINT "AlunoResponsavel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AlunoResponsavel" ADD CONSTRAINT "AlunoResponsavel_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlunoResponsavel" ADD CONSTRAINT "AlunoResponsavel_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "responsaveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
