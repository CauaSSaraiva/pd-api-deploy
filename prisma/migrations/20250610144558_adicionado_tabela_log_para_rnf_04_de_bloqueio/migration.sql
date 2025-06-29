-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "complemento" TEXT,
    "identifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);
