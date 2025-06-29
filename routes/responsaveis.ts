import { Router } from "express"
import { verificaAutenticacao } from "../middlewares/verificaToken";
import bcrypt from "bcrypt";


import { prisma } from "../prisma";
const router = Router()

async function gerarHash() {
  return bcrypt.hash("123456", 10);
}


// rota para adicionar responsavel manualmente pra testes 
// (dados de responsáveis não foram fornecidos pela escola ainda :3)
router.post("/", async (req, res) => {
    try {
      const { nome, alunoId, email } = req.body;
      const senhaHash = await gerarHash();

      // 1. Criar o responsável
      const responsavel = await prisma.responsavel.create({
        data: {
          nome: nome,
          senha_hash: senhaHash,
          email: email
        },
      });

      // 2. Criar o relacionamento com o aluno existente
      const relacionamento = await prisma.alunoResponsavel.create({
        data: {
          aluno_id: alunoId,
          responsavel_id: responsavel.id,
        },
        include: {
          aluno: true,
          responsavel: true,
        },
      });

      res.status(201).json({
        message: "Responsável e relacionamento criados com sucesso",
        data: relacionamento,
      });
    } catch (error) {
      console.error("Erro ao adicionar responsável:", error);
      res.status(500).json({ error: "Erro ao processar a solicitação" });
    }
  });

  router.post("/token", verificaAutenticacao, async (req, res) => {
    const id = req.user?.userLogadoId;
    const perfil = req.user?.userLogadoPerfil;

    if (perfil !== "responsavel") {
      return res
        .status(403)
        .json({ erro: "Apenas responsáveis podem registrar token." });
    }

    const { token } = req.body;

    if (!token) return res.status(400).json({ erro: "Token não enviado" });

    try {
      await prisma.responsavel.update({
        where: { id },
        data: { expo_push_token: token },
      });

      res.status(200).json({ mensagem: "Token salvo com sucesso." });
    } catch (err) {
      console.error("Erro ao salvar token:", err);
      res.status(500).json({ erro: "Erro ao salvar token." });
    }
  });









  router.get("/avisos", verificaAutenticacao, async (req, res) => {
    const responsavelId = req.user?.userLogadoId;

    try {
      const avisos = await prisma.avisoTurma.findMany({
        where: {
          turma: {
            alunos: {
              some: {
                responsaveis: {
                  some: {
                    responsavel_id: responsavelId,
                  },
                },
              },
            },
          },
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

      const resposta = avisos.map((avisoTurma) => ({
        id: avisoTurma.aviso.id,
        titulo: avisoTurma.aviso.titulo,
        mensagem: avisoTurma.aviso.mensagem,
        data: avisoTurma.aviso.data_envio,
        turma: avisoTurma.turma.nome_display,
        imagemBase64: avisoTurma.aviso.imagemBase64,
      }));

      res.json(resposta);
    } catch (err) {
      console.error("Erro ao buscar avisos para responsável:", err);
      res.status(500).json({ error: "Erro ao buscar avisos." });
    }
  });







export default router;