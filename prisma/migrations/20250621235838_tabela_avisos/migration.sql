-- CreateTable
CREATE TABLE "avisos" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(75) NOT NULL,
    "mensagem" VARCHAR(255) NOT NULL,
    "data_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagemBase64" TEXT,
    "professor_id" INTEGER NOT NULL,

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aviso_turma" (
    "id" SERIAL NOT NULL,
    "aviso_id" INTEGER NOT NULL,
    "turma_id" INTEGER NOT NULL,

    CONSTRAINT "aviso_turma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "avisos_mensagem_key" ON "avisos"("mensagem");

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aviso_turma" ADD CONSTRAINT "aviso_turma_aviso_id_fkey" FOREIGN KEY ("aviso_id") REFERENCES "avisos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aviso_turma" ADD CONSTRAINT "aviso_turma_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
