-- AlterTable
ALTER TABLE "Aluno" ADD COLUMN "cpf" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Aluno_cpf_key" ON "Aluno"("cpf");