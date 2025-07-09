// import { PrismaClient } from "@prisma/client"
import { Router } from "express";
import { verificaAutenticacao } from "../middlewares/verificaToken";

import { prisma } from "../prisma";
import { parse } from "path";
const router = Router();

router.post("/chamada", verificaAutenticacao, async (req, res) => {
  const { turmaId, disciplinaId, data, periodo, presencas } = req.body;
  const professorId = req.user?.userLogadoId;

  try {
    if (
      !turmaId ||
      !disciplinaId ||
      !data ||
      !periodo ||
      !Array.isArray(presencas) ||
      !professorId
    ) {
      return res.status(400).json({ erro: "Dados incompletos." });
    }

    // é pra buscar o vínculo de professor x turma x disciplina
    const professorTurma = await prisma.professorTurma.findUnique({
      where: {
        unique_key: {
          professor_id: professorId,
          turma_id: turmaId,
          disciplina_id: disciplinaId,
        },
      },
    });

    if (!professorTurma) {
      return res.status(403).json({
        erro: "Você não está autorizado a registrar chamada para essa turma e disciplina.",
      });
    }

    // Ajusta a data para o fuso
    // const dataBr = new Date(data);
    // // dataBr.setHours(dataBr.getHours() - 3);
    // dataBr.setHours(0, 0, 0, 0); // agr evita chamada duplicada no mesmo dia usando unique composto (periodo, data, professor_turma_id)
    // então, se tiver mais de uma aula no mesmo dia, usa o campo "periodo" pra diferenciar
    // e usa a data sem hora pra atualizar a chamada corretamente

    // console.log(`data recebida: ${data}`);

    const dataStr = data.split("T")[0];
    const dataBr = new Date(dataStr + "T00:00:00.000Z");

    //  Busca aula existente ou cria nova
    let aula = await prisma.aula.findUnique({
      where: {
        unique_aula_periodo: {
          professor_turma_id: professorTurma.id,
          data: dataBr,
          periodo: periodo,
        },
      },
    });

    if (!aula) {
      aula = await prisma.aula.create({
        data: {
          data: dataBr,
          periodo: periodo,
          professorTurma: {
            connect: { id: professorTurma.id },
          },
        },
      });
      console.log(
        `✅ Nova aula criada: ${periodo} - ${dataBr.toLocaleDateString()}`
      );
    } else {
      console.log(
        `ℹ️ Aula existente encontrada: ${periodo} - ${dataBr.toLocaleDateString()}`
      );
      // Limpa frequências anteriores da aula (pra atualizar a chamada)
      await prisma.frequencia.deleteMany({
        where: {
          aula_id: aula.id,
        },
      });
    }

    // Cria novos registros de frequência
    const registros = presencas.map((p) => ({
      aluno_id: p.alunoId,
      aula_id: aula.id,
      presente: p.presente,
    }));

    await prisma.frequencia.createMany({
      data: registros,
      skipDuplicates: true,
    });

    // Notifica responsáveis dos alunos que faltaram
    const alunosFaltaram = registros.filter((r) => !r.presente);

    for (const falta of alunosFaltaram) {
      const alunoComResponsaveis = await prisma.aluno.findUnique({
        where: { id: falta.aluno_id },
        include: {
          responsaveis: {
            include: { responsavel: true },
          },
        },
      });

      if (alunoComResponsaveis) {
        for (const vinculo of alunoComResponsaveis.responsaveis) {
          const token = vinculo.responsavel.expo_push_token;
          if (token) {
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: token,
                sound: "default",
                title: `Falta registrada: ${alunoComResponsaveis.nome}`,
                body: `Seu filho(a) ${
                  alunoComResponsaveis.nome
                } faltou no dia ${new Date(data).toLocaleDateString(
                  "pt-BR"
                )} (${periodo})`,
              }),
            });
          } else {
            console.log(
              `⚠️ Responsável sem token: ${vinculo.responsavel.nome}`
            );
          }
        }
      }
    }

    return res
      .status(201)
      .json({ mensagem: "Chamada registrada com sucesso." });
  } catch (erro) {
    console.error("❌ Erro ao registrar chamada:", erro);
    return res.status(500).json({ erro: "Erro interno ao registrar chamada." });
  }
});

// router.post("/chamada", verificaAutenticacao, async (req, res) => {
//   const { turmaId, disciplinaId, data, presencas } = req.body;
//   const professorId = req.user?.userLogadoId;

//   try {
//     if (
//       !turmaId ||
//       !disciplinaId ||
//       !data ||
//       !Array.isArray(presencas) ||
//       !professorId
//     ) {
//       return res.status(400).json({ erro: "Dados incompletos" });
//     }

//     console.log(`professorId: ${professorId}`);

//     // é pra buscar o vínculo de professor x turma x disciplina
//     const professorTurma = await prisma.professorTurma.findUnique({
//       where: {
//         unique_key: {
//           professor_id: professorId,
//           turma_id: turmaId,
//           disciplina_id: disciplinaId,
//         },
//       },
//     });

//     if (!professorTurma) {
//       return res.status(403).json({
//         erro: "Você não está autorizado a registrar chamada para essa turma/disciplina.",
//       });
//     }

//     const dataBr = new Date(data);
//     dataBr.setHours(dataBr.getHours() - 3);
//     // dataBr.setHours(0, 0, 0, 0); // se precisar descomentar pra evitar chamada duplicada no mesmo dia e adicionar unique composto,
//     // mas depende de externos, como turnos diferentes no mesmo dia, etc.

//     const aula = await prisma.aula.create({
//       data: {
//         data: new Date(dataBr),
//         professorTurma: {
//           connect: { id: professorTurma.id },
//         },
//       },
//     });

//     const registros = presencas.map((p: any) => ({
//       aluno_id: p.alunoId,
//       aula_id: aula.id,
//       presente: p.presente,
//     }));

//     await prisma.frequencia.createMany({
//       data: registros,
//       skipDuplicates: true,
//     });

//     const alunosFaltaram = registros.filter((r) => !r.presente);

//     for (const falta of alunosFaltaram) {
//       const alunoComResponsaveis = await prisma.aluno.findUnique({
//         where: { id: falta.aluno_id },
//         include: {
//           responsaveis: {
//             include: { responsavel: true },
//           },
//         },
//       });

//       if (alunoComResponsaveis) {
//         for (const vinculo of alunoComResponsaveis.responsaveis) {
//           const token = vinculo.responsavel.expo_push_token;
//           if (token) {
//             const respostaPush = await fetch(
//               "https://exp.host/--/api/v2/push/send",
//               {
//                 method: "POST",
//                 headers: {
//                   Accept: "application/json",
//                   "Accept-encoding": "gzip, deflate",
//                   "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                   to: token,
//                   sound: "default",
//                   title: `Falta registrada: ${alunoComResponsaveis.nome}`,
//                   body: `Seu filho(a) ${
//                     alunoComResponsaveis.nome
//                   } faltou no dia ${new Date(data).toLocaleDateString()}`,
//                 }),
//               }
//             );
//             console.log(`resposta push: ${respostaPush}`);
//           } else {
//             console.log(`Responsável sem token: ${vinculo.responsavel.nome}`);
//           }
//         }
//       }
//     }

//     return res
//       .status(201)
//       .json({ mensagem: "Chamada registrada com sucesso." });
//   } catch (erro) {
//     console.error("Erro ao registrar chamada:", erro);
//     return res.status(500).json({ erro: "Erro interno." });
//   }
// });

export default router;
