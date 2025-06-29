/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `responsaveis` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `responsaveis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "responsaveis" ADD COLUMN     "email" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "responsaveis_email_key" ON "responsaveis"("email");
