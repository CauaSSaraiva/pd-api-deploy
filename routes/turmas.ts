import { PrismaClient } from "@prisma/client"
import { Router } from "express"


import { prisma } from "../prisma";
const router = Router()



router.get("/", async (req, res) => {
  try {
    const turmas = await prisma.turma.findMany({
      select: {
        id: true,
        nome_display: true,
      },
      orderBy: { nome_display: "asc" },
    });

    res.json(turmas);
  } catch (err) {
    console.error("Erro ao listar turmas:", err);
    res.status(500).json({ error: "Erro ao buscar turmas." });
  }
});

// pra listar só as turmas que o professor está vinculado no front
router.get("/:id", async (req, res) => {
  try {
    const professorId = req.params.id;

    const turmas = await prisma.turma.findMany({
      where: {
        professorTurmas: {
          some: {
            professor_id: Number(professorId),
            ativo: true
          },
        },
      },
      select: {
        id: true,
        nome_display: true,
      },
      orderBy: { nome_display: "asc" },
    });

    res.json(turmas);
  } catch (err) {
    console.error("Erro ao listar turmas:", err);
    res.status(500).json({ error: "Erro ao buscar turmas." });
  }
});




export default router