-- CreateTable
CREATE TABLE "series" (
    "id" SERIAL NOT NULL,
    "descricao" VARCHAR(45) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escolas" (
    "id" TEXT NOT NULL,
    "descricao" VARCHAR(45) NOT NULL,

    CONSTRAINT "escolas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinas" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(45) NOT NULL,
    "descricao" VARCHAR(45) NOT NULL,

    CONSTRAINT "disciplinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos" (
    "id" SERIAL NOT NULL,
    "descricao" VARCHAR(45) NOT NULL,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "ra" VARCHAR(45) NOT NULL,
    "senha_hash" VARCHAR(45),
    "turmaId" INTEGER NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas" (
    "id" SERIAL NOT NULL,
    "nome_display" VARCHAR(45) NOT NULL,
    "escola_id" TEXT NOT NULL,
    "serie_id" INTEGER NOT NULL,
    "turno_id" INTEGER NOT NULL,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professores" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(75) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "codigo" VARCHAR(255) NOT NULL,
    "senha_hash" VARCHAR(65),

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professor_turmas" (
    "id" SERIAL NOT NULL,
    "turma_id" INTEGER NOT NULL,
    "professor_id" INTEGER NOT NULL,
    "disciplina_id" INTEGER NOT NULL,

    CONSTRAINT "professor_turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aulas" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "professor_turma_id" INTEGER NOT NULL,

    CONSTRAINT "aulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frequencias" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aluno_id" INTEGER NOT NULL,
    "aula_id" INTEGER NOT NULL,

    CONSTRAINT "frequencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disciplinas_codigo_key" ON "disciplinas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_ra_key" ON "alunos"("ra");

-- CreateIndex
CREATE UNIQUE INDEX "turmas_serie_id_turno_id_escola_id_key" ON "turmas"("serie_id", "turno_id", "escola_id");

-- CreateIndex
CREATE UNIQUE INDEX "professores_email_key" ON "professores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professores_codigo_key" ON "professores"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "professor_turmas_professor_id_turma_id_disciplina_id_key" ON "professor_turmas"("professor_id", "turma_id", "disciplina_id");

-- CreateIndex
CREATE UNIQUE INDEX "frequencias_aula_id_aluno_id_key" ON "frequencias"("aula_id", "aluno_id");

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_turmas" ADD CONSTRAINT "professor_turmas_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_turmas" ADD CONSTRAINT "professor_turmas_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_turmas" ADD CONSTRAINT "professor_turmas_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_professor_turma_id_fkey" FOREIGN KEY ("professor_turma_id") REFERENCES "professor_turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequencias" ADD CONSTRAINT "frequencias_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequencias" ADD CONSTRAINT "frequencias_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
