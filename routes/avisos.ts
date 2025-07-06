// import { PrismaClient } from "@prisma/client"
import { Router } from "express";
import { verificaAutenticacao } from "../middlewares/verificaToken";
import multer from "multer";

import { prisma } from "../prisma";
const router = Router();

const storage = multer.memoryStorage();

// Configuração do Multer
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname) {
      file.originalname = "uploaded_file"; // Nome padrão se estiver faltando
    }
    cb(null, true);
  },
  //  limite de tamanho de arquivo, para evitar que uploads muito grandes travem
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post(
  "/",
  upload.single("imagemAviso"),
  verificaAutenticacao,
  async (req, res) => {
    const { titulo, mensagem, professor_id, turmas } = req.body;
    console.log("Imagem recebida:", req.file?.originalname, req.file?.mimetype);
    const imagemBase64 = req.file?.buffer.toString("base64");

    if (!titulo || !mensagem || !professor_id || !turmas) {
      res.status(400).json({ erro: "Informe todos os dados necessários" });
      return;
    }

    try {
      const aviso = await prisma.aviso.create({
        data: {
          titulo,
          mensagem,
          imagemBase64: imagemBase64 || null,
          professor_id: Number(professor_id),
        },
      });
      // res.status(201).json(foto);
      console.log(
        "Imagem recebida:",
        req.file?.originalname,
        req.file?.mimetype
      );

      const turmasArray = Array.isArray(turmas) ? turmas : [turmas];
      console.log(`turmasArray: ${turmasArray}`);
      const avisosTurmasPayload = turmasArray.map((turmaId: string) => ({
        aviso_id: aviso.id,
        turma_id: Number(turmaId),
      }));
      console.log(
        `avisosTurmasPayload: ${JSON.stringify(avisosTurmasPayload)}`
      );

      await prisma.avisoTurma.createMany({
        data: avisosTurmasPayload,
        skipDuplicates: true,
      });

      res.status(201).json({
        mensagem: "Aviso criado com sucesso.",
        aviso: {
          id: aviso.id,
          titulo: aviso.titulo,
          mensagem: aviso.mensagem,
          imagemBase64: aviso.imagemBase64,
          professor_id: aviso.professor_id,
        },
      });
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

router.get("/", verificaAutenticacao, async (req, res) => {
  const professorId = req.user?.userLogadoId;

  if (req.user?.userLogadoPerfil !== "professor") {
    return res
      .status(403)
      .json({
        error: "Acesso negado. Apenas professores podem acessar esta rota.",
      });
  }

  try {
    const avisos = await prisma.aviso.findMany({
      orderBy: {
        data_envio: "desc",
      },
    });

    const resposta = avisos.map((avisoTurma) => ({
      id: avisoTurma.id,
      titulo: avisoTurma.titulo,
      mensagem: avisoTurma.mensagem,
      data: avisoTurma.data_envio.toISOString(),
      imagemBase64: avisoTurma.imagemBase64,
    }));

    res.json(resposta);
  } catch (err) {
    console.error("Erro ao buscar avisos para professores:", err);
    res.status(500).json({ error: "Erro ao buscar avisos." });
  }
});

export default router;
