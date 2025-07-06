import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import { verificaAutenticacao } from "../middlewares/verificaToken";


import { prisma } from "../prisma";
const router = Router()



router.get("/turma/:id", async (req, res) => {
  const turmaId = Number(req.params.id);
  if (isNaN(turmaId))
    return res.status(400).json({ error: "ID de turma inválido." });

  try {
    const alunos = await prisma.aluno.findMany({
      where: { turmaId },
      select: {
        id: true,
        nome: true,
        ra: true,
      },
      orderBy: { nome: "asc" },
    });

    res.json(alunos);
  } catch (err) {
    console.error("Erro ao buscar alunos da turma:", err);
    res.status(500).json({ error: "Erro ao buscar alunos." });
  }
});


    // const avisoTurmas = await prisma.avisoTurma.findMany({
    //   where: { turma_id: aluno.turmaId },
    //   select: {
    //     aviso_id: true
    //   }
    // });

    // const turmaAvisos = avisoTurmas.map(at => at.aviso_id);

    // const avisos = await prisma.aviso.findMany({
    //   where: { id: { in: turmaAvisos } },
    //   orderBy: { data_envio: "desc" },
    // });

router.get("/avisos",verificaAutenticacao, async (req, res) => {
  console.log("Rota /avisos acessada");
  const alunoId = req.user?.userLogadoId;
  console.log("ID do aluno logado:", alunoId);

  try {
    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
      select: {
        turmaId: true,
      }
    });

    if (!aluno?.turmaId) {
      return res.status(404).json({ error: "Aluno não possui turma registrada" });
    }

    const avisos = await prisma.avisoTurma.findMany({
      where: {
        turma_id: aluno.turmaId,
      },
      include: {
        aviso: true,
        turma: {
          select: {
            nome_display: true,
          },
        },
      },
      orderBy: {
        aviso: {
          data_envio: "desc",
        },
      },
    });

    // 3. Formata a resposta para incluir informações relevantes
    const resposta = avisos.map((avisoTurma) => ({
      id: avisoTurma.aviso.id,
      titulo: avisoTurma.aviso.titulo,
      mensagem: avisoTurma.aviso.mensagem,
      data: avisoTurma.aviso.data_envio.toISOString(),
      turma: avisoTurma.turma.nome_display,
      imagemBase64: avisoTurma.aviso.imagemBase64,
    }));
    console.log("Avisos encontrados:", resposta);

    res.json(resposta);
  } catch (err) {
    console.error("Erro ao buscar alunos da turma:", err);
    res.status(500).json({ error: "Erro ao buscar alunos." });
  }
});


















export default router;