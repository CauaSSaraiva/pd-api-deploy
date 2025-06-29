import { Router } from "express"
// import { verificaAutenticacao } from "../middlewares/verificaToken";


import { prisma } from "../prisma";
const router = Router()




router.get("/:professorId/:turmaId", async (req, res) => {
    try {
      const { professorId, turmaId } = req.params;
  
      const disciplinas = await prisma.professorTurma.findMany({
        select: {
          disciplina: {
            select: {
              id: true,
              descricao: true,
              codigo: true,
            }
          }
        },
        where: {
          professor_id: parseInt(professorId),
          turma_id: parseInt(turmaId),
        },
      });
  
  
      const disciplinasFormatadas = disciplinas.map(parte => parte.disciplina);
  
      res.json(disciplinasFormatadas);
    } catch (err) {
      console.error("Erro ao listar disciplinas:", err);
      res.status(500).json({ error: "Erro ao buscar disciplinas." });
    }
  });







export default router;