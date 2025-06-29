import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"
// import supabase from '../supabaseClient';
// import authenticateUser from "../middlewares/DESCONTINUADOverificaToken";
import { verificaAutenticacao } from "../middlewares/verificaToken"


import { prisma } from "../prisma";
const router = Router()

async function diferenciarPerfil(identifier: string) {
    // Se for apenas números, é aluno
    try {
        if (/^\d+$/.test(identifier)) {
            const aluno = await prisma.aluno.findUnique({
                where: { ra: identifier }
            });
            return { usuario: aluno, perfil: 'aluno' };
            
        } else {
            // Se for email, verifica primeiro em professor, depois responsável
            const professor = await prisma.professor.findUnique({
                where: { email: identifier }
            });
            if (professor) return { usuario: professor, perfil: 'professor' };
            
            const responsavel = await prisma.responsavel.findUnique({
                where: { email: identifier }
            });
            if (responsavel) return { usuario: responsavel, perfil: 'responsavel' };

            return { usuario: null, perfil: null };
        }
    } catch (error) {
        throw new Error('Credenciais não encontradas');     
    }
    
    
}

router.post("/", async (req, res) => {
  const { identificador, senha } = req.body;

  const mensaPadrao = "Login ou senha incorretos";
  const mensaBloqueado =
    "Limite de tentativas atingido, tente novamente em alguns minutos";
  const sucesso = "Acesso com Sucesso";
  const bloqueio = "Usuario bloqueado";
  const fracasso = "Tentativa de acesso invalida";

  if (!identificador || !senha) {
    // res.status(400).json({ erro: "Informe e-mail e senha do usuário" })
    res.status(400).json({ erro: mensaPadrao });
    return;
  }




  try {
    const { usuario, perfil } = await diferenciarPerfil(identificador);

    if (!usuario || !perfil) {
      // res.status(400).json({ erro: "E-mail inválido" })
      res.status(400).json({ erro: mensaPadrao });
      return;
    }

    const ultimoBloqueio = await prisma.log.findFirst({
      where: {
        identifier: identificador,
        descricao: bloqueio,
      },
      orderBy: { createdAt: "desc" },
    });

    if (ultimoBloqueio) {
      const bloqueioExpira = new Date(ultimoBloqueio.createdAt);
      bloqueioExpira.setMinutes(bloqueioExpira.getMinutes() + 15); // bloqueio por 15 minutos (RNF04)

      if (new Date() < bloqueioExpira) {
        // simples: se a data atual for menor que a data de expiração do bloqueio
        res.status(400).json({ erro: mensaBloqueado });
        return;
      }
    }

    // Conta falhas consecutivas
    const ultimoSucesso = await prisma.log.findFirst({
      where: {
        identifier: identificador,
        descricao: sucesso,
      },
      orderBy: { createdAt: "desc" },
    });


    // testando percebi: se nunca teve sucesso, era bloqueado eternamente,
    // ai tentei colocar o ultimo ali de 24h, mas ele criava novo log de bloqueio no periodo de 24h -> eterno de novo
    // então agora: se nunca teve sucesso, só considera FALHAS (não bloqueio) após o ultimo bloqueio
    // se não tiver nenhum dos 2, ultimas 24h.
    const filtroFalhasData = ultimoSucesso
      ? { gt: ultimoSucesso.createdAt }
      : ultimoBloqueio
      ? { gt: ultimoBloqueio.createdAt }
      : { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) };

    const falhasConsecutivas = await prisma.log.count({
      where: {
        identifier: identificador,
        descricao: fracasso,
        createdAt: filtroFalhasData
      },
    });

    if (falhasConsecutivas >= 5) {

      // Cria o log de bloqueio
      await prisma.log.create({
        data: {
          descricao: bloqueio,
          complemento: `${perfil}: ${identificador} - 5 falhas consecutivas`,
          identifier: identificador,
        },
      });
      res.status(400).json({ erro: mensaBloqueado });
      return;
    }

    if (usuario.senha_hash && bcrypt.compareSync(senha, usuario.senha_hash)) {
      const token = jwt.sign(
        {
          userLogadoId: usuario.id,
          userLogadoNome: usuario.nome,
          userLogadoPerfil: perfil,
        },
        process.env.JWT_KEY as string,
        { expiresIn: "1h" }
      );

      // Log de sucesso
      await prisma.log.create({
        data: {
          descricao: sucesso,
          complemento: `${perfil}: ${identificador}`,
          identifier: identificador,
        },
      });

      res.status(200).json({
        id: usuario.id,
        nome: usuario.nome,
        perfil: perfil,
        token,
        precisaTrocarSenha: usuario.precisaTrocarSenha
      });

    } else {

      // Log de fracasso
      await prisma.log.create({
        data: {
          descricao: fracasso,
          complemento: `${perfil || "Desconhecido"}: ${identificador}`,
          identifier: identificador,
        },
      });

      res.status(400).json({ erro: mensaPadrao });
    }
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
})






router.post("/alterar-senha", verificaAutenticacao, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  const { userLogadoId, userLogadoPerfil } = req.user!;

  try {
    let usuario;
    if (userLogadoPerfil === "aluno") {
      usuario = await prisma.aluno.findUnique({ where: { id: userLogadoId } });
    } else if (userLogadoPerfil === "professor") {
      usuario = await prisma.professor.findUnique({
        where: { id: userLogadoId },
      });
    } else {
      usuario = await prisma.responsavel.findUnique({
        where: { id: userLogadoId },
      });
    }

    if (!usuario || !usuario.senha_hash) {
      return res.status(400).json({ erro: "Usuário inválido." });
    }

    const senhaConfere = bcrypt.compareSync(senhaAtual, usuario.senha_hash);
    if (!senhaConfere) {
      return res.status(400).json({ erro: "Senha atual incorreta." });
    }

    const novaHash = bcrypt.hashSync(novaSenha, 10);

    if (userLogadoPerfil === "aluno") {
      await prisma.aluno.update({
        where: { id: userLogadoId },
        data: { senha_hash: novaHash, precisaTrocarSenha: false },
      });
    } else if (userLogadoPerfil === "professor") {
      await prisma.professor.update({
        where: { id: userLogadoId },
        data: { senha_hash: novaHash, precisaTrocarSenha: false },
      });
    } else {
      await prisma.responsavel.update({
        where: { id: userLogadoId },
        data: { senha_hash: novaHash, precisaTrocarSenha: false },
      });
    }

    res.status(200).json({ mensagem: "Senha alterada com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao alterar senha." });
  }
});




export default router