-- CreateIndex
CREATE INDEX "Aluno_status_idx" ON "Aluno"("status");

-- CreateIndex
CREATE INDEX "Boleto_alunoId_status_idx" ON "Boleto"("alunoId", "status");

-- CreateIndex
CREATE INDEX "Boleto_status_mesReferencia_idx" ON "Boleto"("status", "mesReferencia");

-- CreateIndex
CREATE INDEX "Materia_turmaId_idx" ON "Materia"("turmaId");

-- CreateIndex
CREATE INDEX "Materia_instrutorId_idx" ON "Materia"("instrutorId");

-- CreateIndex
CREATE INDEX "Matricula_materiaId_status_idx" ON "Matricula"("materiaId", "status");

-- CreateIndex
CREATE INDEX "Matricula_status_idx" ON "Matricula"("status");

-- CreateIndex
CREATE INDEX "Nota_matriculaId_idx" ON "Nota"("matriculaId");

-- CreateIndex
CREATE INDEX "Presenca_alunoId_data_idx" ON "Presenca"("alunoId", "data");

-- CreateIndex
CREATE INDEX "Presenca_turmaId_data_idx" ON "Presenca"("turmaId", "data");

-- CreateIndex
CREATE INDEX "Presenca_materiaId_data_idx" ON "Presenca"("materiaId", "data");

-- CreateIndex
CREATE INDEX "Turma_cursoId_idx" ON "Turma"("cursoId");
