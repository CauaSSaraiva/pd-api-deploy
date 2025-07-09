
import { Router } from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import fs from "fs";
import { prisma } from "../prisma"; // <- usar assim impede mil prisma client gerados, usa só 1
import { basePrisma } from "../prisma";

const router = Router();
// const upload = multer({ dest: "uploads" });


// Adicione a nova configuração para memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

interface LinhaProcessada {
  escolaCod: string;
  raAluno: string;
  nomeAluno: string;
  // anoLetivo: string;
  serie: number;
  turno: number;
  disciplinaCod: string;
  disciplinaNome: string;
  profCod: string;
  profNome: string;
  profEmail: string;
}

async function gerarHash() {
  return bcrypt.hash("123456", 10);
}


async function processarBatchOtimizado(
  batch: LinhaProcessada[],
  senhaHash: string
): Promise<void> {
  // 1. Extrair dados únicos do batch
  const dadosUnicos = extrairDadosUnicos(batch);

  // 2. upserts e inserts 
  const [, , , disciplinasMap, professoresMap] =
    await Promise.all([
      inserirSeries(dadosUnicos.series),
      inserirTurnos(dadosUnicos.turnos),
      inserirEscolas(dadosUnicos.escolas),
      inserirDisciplinas(dadosUnicos.disciplinas),
      upsertProfessores(dadosUnicos.professores, senhaHash),
    ]);

  // 3. turmas (dependem das entidades 'safe' acima)
  const turmasMap = await inserirTurmas(dadosUnicos.turmas);

  // 4. alunos e professorTurma em paralelo
  await Promise.all([
    upsertAlunos(dadosUnicos.alunos, turmasMap, senhaHash),
    // inserirProfessorTurma(
    //   dadosUnicos.professorTurmas,
    //   professoresMap,
    //   turmasMap,
    //   disciplinasMap
    // ),
  ]);
}

async function processarProfessorTurmaFinal(
  todosOsDados: LinhaProcessada[],
  senhaHash: string
): Promise<void> {
  const dadosUnicos = extrairDadosUnicos(todosOsDados);

  // Buscar mapas necessários
  const [disciplinasMap, professoresMap] = await Promise.all([
    buscarDisciplinasMap(dadosUnicos.disciplinas),
    buscarProfessoresMap(dadosUnicos.professores),
  ]);

  const turmasMap = await buscarTurmasMap(dadosUnicos.turmas);

  // Agora sim, substituir relacionamentos
  await upsertProfessorTurma(
    dadosUnicos.professorTurmas,
    professoresMap,
    turmasMap,
    disciplinasMap
  );
}

// Funções auxiliares para buscar dados existentes
async function buscarDisciplinasMap(
  disciplinas: { codigo: string; descricao: string }[]
): Promise<Map<string, any>> {
  const codigos = disciplinas.map((d) => d.codigo);
  const todas = await prisma.disciplina.findMany({
    where: { codigo: { in: codigos } },
  });
  return new Map(todas.map((d) => [d.codigo, d]));
}

async function buscarProfessoresMap(
  professores: { email: string }[]
): Promise<Map<string, any>> {
  const emails = professores.map((p) => p.email);
  const todos = await prisma.professor.findMany({
    where: { email: { in: emails } },
  });
  return new Map(todos.map((p) => [p.email, p]));
}

async function buscarTurmasMap(
  turmas: { serie: number; turno: number; escola: string }[]
): Promise<Map<string, any>> {
  const todas = await prisma.turma.findMany({
    where: {
      OR: turmas.map((t) => ({
        serie_id: t.serie,
        turno_id: t.turno,
        escola_id: t.escola,
      })),
    },
  });

  const map = new Map<string, any>();
  for (const t of todas) {
    const key = `${t.serie_id}-${t.turno_id}-${t.escola_id}`;
    map.set(key, t);
  }
  return map;
}


type Professor = { nome: string; codigo: string; email: string };
type Aluno = { nome: string; ra: string; turmaKey: string };
type Disciplina = { codigo: string; descricao: string };
type TurmaInfo = { serie: number; turno: number; escola: string; key: string };


const criarTurmaKey = (serie: number, turno: number, escolaCod: string): string => 
  `${serie}-${turno}-${escolaCod}`;


function extrairDadosBasicos(batch: LinhaProcessada[]) {
  const series = new Set<number>();
  const turnos = new Set<number>();
  const escolas = new Set<string>();

  batch.forEach(item => {
    series.add(item.serie);
    turnos.add(item.turno);
    escolas.add(item.escolaCod);
  });

  return {
    series: Array.from(series),
    turnos: Array.from(turnos),
    escolas: Array.from(escolas)
  };
}


function extrairDisciplinas(batch: LinhaProcessada[]): Disciplina[] {
  const disciplinas = new Map<string, string>();

  batch.forEach(item => {
    disciplinas.set(item.disciplinaCod, item.disciplinaNome.trim());
  });

  return Array.from(disciplinas.entries())
    .map(([codigo, descricao]) => ({ codigo, descricao }));
}


function extrairProfessores(batch: LinhaProcessada[]): Professor[] {
  const professores = new Map<string, Professor>();

  batch.forEach(item => {
    professores.set(item.profEmail.trim(), {
      nome: item.profNome.trim(),
      codigo: item.profCod.trim(),
      email: item.profEmail.trim(),
    });
  });

  return Array.from(professores.values());
}

function extrairTurmas(batch: LinhaProcessada[]): TurmaInfo[] {
  const turmasKeys = new Set<string>();

  batch.forEach(item => {
    turmasKeys.add(criarTurmaKey(item.serie, item.turno, item.escolaCod));
  });

  return Array.from(turmasKeys).map(key => {
    const [serie, turno, escola] = key.split("-");
    return {
      serie: Number(serie),
      turno: Number(turno),
      escola,
      key
    };
  });
}

function extrairAlunos(batch: LinhaProcessada[]): Aluno[] {
  const alunos = new Map<string, Aluno>();

  batch.forEach(item => {
    const turmaKey = criarTurmaKey(item.serie, item.turno, item.escolaCod);
    alunos.set(item.raAluno.trim(), {
      nome: item.nomeAluno.trim(),
      ra: item.raAluno.trim(),
      turmaKey
    });
  });

  return Array.from(alunos.values());
}

function extrairProfessorTurmas(batch: LinhaProcessada[]): string[] {
  const professorTurmas = new Set<string>();

  batch.forEach(item => {
    const turmaKey = criarTurmaKey(item.serie, item.turno, item.escolaCod);
    const key = `${item.profEmail.trim()}-${turmaKey}-${item.disciplinaCod.trim()}`;
    professorTurmas.add(key);
  });

  return Array.from(professorTurmas);
}

function extrairDadosUnicos(batch: LinhaProcessada[]) {
  
  const dadosBasicos = extrairDadosBasicos(batch);
  const disciplinas = extrairDisciplinas(batch);
  const professores = extrairProfessores(batch);
  const turmas = extrairTurmas(batch);
  const alunos = extrairAlunos(batch);
  const professorTurmas = extrairProfessorTurmas(batch);

  return {
    series: dadosBasicos.series,
    turnos: dadosBasicos.turnos,
    escolas: dadosBasicos.escolas,
    disciplinas,
    professores,
    turmas,
    alunos,
    professorTurmas,
  };
}



// createmany das series otimizado
async function inserirSeries(series: number[]): Promise<Map<number, any>> {
  const data = series.map((id) => {
    const anoReal = 10 - id;
    return {
      id,
      descricao: `${anoReal}º ano`,
    };
  });

  const criados = await prisma.serie.createManyAndReturn({
    data,
    skipDuplicates: true,
  });

  return new Map(criados.map((s) => [s.id, s]));
}


// createmany dos turnos otimizado
async function inserirTurnos(turnos: number[]): Promise<Map<number, any>> {
  const criados = await prisma.turno.createManyAndReturn({
    data: turnos.map((id) => ({
      id,
      descricao: id === 1 ? "Manhã" : "Tarde",
    })),
    skipDuplicates: true,
  });


  return new Map(criados.map((t) => [t.id, t]));
}


// createmany das escolas otimizado
async function inserirEscolas(escolas: string[]): Promise<Map<string, any>> {
  const criados = await prisma.escola.createManyAndReturn({
    data: escolas.map((id) => ({
      id,
      descricao: `Escola ${id}`,
    })),
    skipDuplicates: true,
  });

  return new Map(criados.map((e) => [e.id, e]));
}


// // createmany das disciplinas otimizado
async function inserirDisciplinas(
  disciplinas: { codigo: string; descricao: string }[]
): Promise<Map<string, any>> {

    const criados = await prisma.disciplina.createManyAndReturn({
      data: disciplinas,
      skipDuplicates: true,
    });
  
  return new Map(criados.map((d) => [d.codigo, d]));
}


// Simulação de Upsertmany para professores
async function upsertProfessores(
  professores: { nome: string; codigo: string; email: string }[],
  senhaHash: string
): Promise<Map<string, any>> {
  const emails = professores.map((p) => p.email);

  const existentes = await prisma.professor.findMany({
    where: { email: { in: emails } },
  });

  const existentesMap = new Map(existentes.map((p) => [p.email, p]));
  const paraCriar = professores.filter((p) => !existentesMap.has(p.email));

  // atualiza os existentes em paralelo (se necessário)
  const updates = professores
    .filter((p) => existentesMap.has(p.email))
    .map((p) =>
      prisma.professor.update({
        where: { email: p.email },
        data: { nome: p.nome, codigo: p.codigo },
      })
    );

  // executa tudo em paralelo, os pra criar e atualizar
  await Promise.all([
    Promise.all(updates),
    paraCriar.length > 0
      ? prisma.professor.createMany({
          data: paraCriar.map((p) => ({
            ...p,
            senha_hash: String(senhaHash),
          })),
          skipDuplicates: true,
        })
      : Promise.resolve(),
  ]);

  // Buscar todos os professores atualizados
  const todosProfessores = await prisma.professor.findMany({
    where: { email: { in: emails } },
  });

  return new Map(todosProfessores.map((p) => [p.email, p]));
}

function descricaoSerie(id: number): string {
  return `${10 - id}º ano`;
}

async function inserirTurmas(
  turmas: { serie: number; turno: number; escola: string; key: string }[]
): Promise<Map<string, any>> {
  const dadosParaCriar = turmas.map((t) => ({
    nome_display: descricaoSerie(t.serie) + ` - ${t.turno === 1 ? "Manhã" : "Tarde"}`,
    serie_id: t.serie,
    turno_id: t.turno,
    escola_id: t.escola,
  }));

  await prisma.turma.createMany({
    data: dadosParaCriar,
    skipDuplicates: true,
  });

  // corrigido: agr garante que todas as turmas foram buscadas
  const todas = await prisma.turma.findMany({
    where: {
      OR: turmas.map((t) => ({
        serie_id: t.serie,
        turno_id: t.turno,
        escola_id: t.escola,
      })),
    },
  });

  // Map correto com a key original
  const map = new Map<string, any>();
  for (const t of todas) {
    const key = `${t.serie_id}-${t.turno_id}-${t.escola_id}`;
    map.set(key, t);
  }

  return map;
}

// Simulação de Upsertmany para alunos
async function upsertAlunos(
  alunos: { nome: string; ra: string; turmaKey: string }[],
  turmasMap: Map<string, any>,
  senha: string
): Promise<void> {
  const ras = alunos.map((a) => a.ra);



  const existentes = await prisma.aluno.findMany({
    where: { ra: { in: ras } },
  });

  const existentesMap = new Map(existentes.map((a) => [a.ra, a]));
  const paraCriar = alunos.filter((a) => !existentesMap.has(a.ra));

  // Updates em paralelo
  const updates = alunos
    .filter((a) => existentesMap.has(a.ra))
    .map((a) => {
      const turma = turmasMap.get(a.turmaKey);
      return prisma.aluno.update({
        where: { ra: a.ra },
        data: { nome: a.nome, turmaId: turma?.id },
      });
    });

  // Executar updates e creates em paralelo
  await Promise.all([
    Promise.all(updates),
    paraCriar.length > 0
      ? prisma.aluno.createMany({
          data: paraCriar.map((a) => {
            const turma = turmasMap.get(a.turmaKey);
            return {
              ra: a.ra,
              nome: a.nome,
              turmaId: turma?.id,
              senha_hash: senha
            };
          }),
          skipDuplicates: true,
        })
      : Promise.resolve(),
  ]);
}

// Insert otimizado para professor_turma (jesus essa aqui)
async function upsertProfessorTurma(
  professorTurmas: string[],
  professoresMap: Map<string, any>,
  turmasMap: Map<string, any>,
  disciplinasMap: Map<string, any>
): Promise<void> {
  if (professorTurmas.length === 0) {
    console.log("DEBUG: professorTurmas está vazio, retornando.");
    return;
  }

  const dados = professorTurmas
    .map((key) => {
      const ultimoHifen = key.lastIndexOf("-");
      const disciplinaCod = key.substring(ultimoHifen + 1);
      const emailETurma = key.substring(0, ultimoHifen);
      const primeiroHifenAposArroba = emailETurma.indexOf(
        "-",
        emailETurma.indexOf("@")
      );

      const profEmail = emailETurma.substring(0, primeiroHifenAposArroba);
      const turmaKey = emailETurma.substring(primeiroHifenAposArroba + 1); // Corrigido novamente aqui caso tenha sido digitado errado antes

      const professor = professoresMap.get(profEmail);
      const turma = turmasMap.get(turmaKey);
      const disciplina = disciplinasMap.get(disciplinaCod);

      return professor && turma && disciplina
        ? {
            professor_id: professor.id,
            turma_id: turma.id,
            disciplina_id: disciplina.id,
            profEmail,
            chaveUnica: `${professor.id}-${turma.id}-${disciplina.id}`, // Para comparação
            // Inclua a chave original do arquivo para facilitar o rastreamento
            originalKey: key,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (dados.length === 0) {
    console.log("DEBUG: Array 'dados' está vazio após filtragem, retornando.");
    return;
  }

  // Agrupar por professor
  const porProfessor = dados.reduce((acc, d) => {
    if (!acc[d.profEmail]) acc[d.profEmail] = [];
    acc[d.profEmail].push(d);
    return acc;
  }, {} as Record<string, typeof dados>);

  // Para cada professor, gerenciar suas turmas
  for (const [email, relacionamentos] of Object.entries(porProfessor)) {
    console.log(
      `DEBUG: Processando professor: ${email} com ${relacionamentos.length} relacionamentos do arquivo.`
    );
    if (relacionamentos.length === 0) continue;

    const professorId = relacionamentos[0].professor_id;

    // Buscar relacionamentos existentes do professor (incluindo soft deleted)
    const existentes = await basePrisma.professorTurma.findMany({
      where: { professor_id: professorId },
      select: {
        id: true,
        professor_id: true,
        turma_id: true,
        disciplina_id: true,
        ativo: true,
      },
    });
    // console.log(
    //   `DEBUG: Encontrados ${existentes.length} registros existentes no DB para o professor ${email}.`
    // );

    // Criar Set das chaves que DEVERIAM existir (vindos do arquivo)
    const chavesNovas = new Set(relacionamentos.map((r) => r.chaveUnica));
    // console.log(
    //   `DEBUG: Chaves do arquivo (chavesNovas) para o professor ${email}:`,
    //   Array.from(chavesNovas)
    // );

    // Criar Map dos relacionamentos existentes no BD para fácil consulta
    const chavesExistentesDoBancoMap = new Map(
      existentes.map((e) => [
        `${e.professor_id}-${e.turma_id}-${e.disciplina_id}`,
        e,
      ])
    );

    // o problema era o maldito middleware do client prisma, NEM FERRANDO CARA KKKKKKKKKKKK
    // console.log("DEBUG: EXISTENTES (do banco):");
    // existentes.forEach((e) =>
    //   console.log(
    //     `  - ${e.professor_id}-${e.turma_id}-${e.disciplina_id} (Ativo: ${e.ativo})`
    //   )
    // );

    // console.log("DEBUG: RELACIONAMENTOS (do arquivo):");
    // relacionamentos.forEach((r) =>
    //   console.log(`  - ${r.chaveUnica} (original: ${r.originalKey})`)
    // );

    // 1. Reativar relacionamentos que existem no arquivo mas estão soft deleted
    const paraReativar = existentes.filter(
      (e) =>
        !e.ativo && // Se está inativo no banco DE DADOS
        chavesNovas.has(`${e.professor_id}-${e.turma_id}-${e.disciplina_id}`) // E a chave correspondente está no ARQUIVO
    );

    if (paraReativar.length > 0) {
      await prisma.professorTurma.updateMany({
        where: {
          id: { in: paraReativar.map((p) => p.id) },
        },
        data: {
          ativo: true,
          deletado_em: null,
          atualizado_em: new Date(),
        },
      });
    }
    // 2. Soft delete relacionamentos que não existem mais no arquivo
    const paraSoftDelete = existentes.filter(
      (e) =>
        e.ativo && // Se está ativo no banco DE DADOS
        !chavesNovas.has(`${e.professor_id}-${e.turma_id}-${e.disciplina_id}`) // E a chave NÃO está no ARQUIVO
    );

    if (paraSoftDelete.length > 0) {
      await softDeleteProfessorTurmasCascata(paraSoftDelete.map((p) => p.id));
    } else {
    }

    // 3. Criar novos relacionamentos que não existem
    const novosRelacionamentos = relacionamentos.filter(
      (r) => !chavesExistentesDoBancoMap.has(r.chaveUnica) // Se a chave do arquivo NÃO existe no banco (nem ativo, nem inativo)
    );

    if (novosRelacionamentos.length > 0) {
      await prisma.professorTurma.createMany({
        data: novosRelacionamentos.map((r) => ({
          professor_id: r.professor_id,
          turma_id: r.turma_id,
          disciplina_id: r.disciplina_id,
          ativo: true,
        })),
        skipDuplicates: true,
      });
    }
  }
  console.log(`DEBUG: upsertProfessorTurma finalizado.`);
}



// Função auxiliar para soft delete em cascata
async function softDeleteProfessorTurmasCascata(
  professorTurmaIds: number[]
): Promise<void> {
  const agora = new Date();

  // 1. Buscar todas as aulas ativas destes professor_turma
  const aulas = await prisma.aula.findMany({
    where: {
      professor_turma_id: { in: professorTurmaIds },
      ativo: true,
    },
    select: { id: true },
  });

  const aulaIds = aulas.map((a) => a.id);

  // 2. Soft delete das frequências
  if (aulaIds.length > 0) {
    await prisma.frequencia.updateMany({
      where: {
        aula_id: { in: aulaIds },
        ativo: true,
      },
      data: {
        ativo: false,
        deletado_em: agora,
      },
    });
  }

  // 3. Soft delete das aulas
  if (aulaIds.length > 0) {
    await prisma.aula.updateMany({
      where: {
        id: { in: aulaIds },
        ativo: true,
      },
      data: {
        ativo: false,
        deletado_em: agora,
      },
    });
  }

  // 4. Soft delete dos professor_turma
  await prisma.professorTurma.updateMany({
    where: {
      id: { in: professorTurmaIds },
      ativo: true,
    },
    data: {
      ativo: false,
      deletado_em: agora,
    },
  });
}


// router.delete("/limpar", async (req, res) => {
//   // ROTA SÓ PRA LIMPAR O DB SEM TER QUE MIGRAR DE NOVO
//   // PRA PODER TESTAR A FUNÇÃO DE IMPORT E VELOCIDADE
//   await prisma.professorTurma.deleteMany();
//   await prisma.professor.deleteMany();
//   await prisma.aluno.deleteMany();
//   await prisma.turma.deleteMany();
//   await prisma.disciplina.deleteMany();
//   await prisma.serie.deleteMany();
//   await prisma.turma.deleteMany();
//   await prisma.turno.deleteMany();

//   // reseta os ID, se não o 1° registro é o registro 30 KKK
//   await prisma.$executeRawUnsafe(
//     `TRUNCATE TABLE "series" RESTART IDENTITY CASCADE`
//   );
//   await prisma.$executeRawUnsafe(
//     `TRUNCATE TABLE "turnos" RESTART IDENTITY CASCADE`
//   );
//   await prisma.$executeRawUnsafe(
//     `TRUNCATE TABLE "escolas" RESTART IDENTITY CASCADE`
//   );
//   await prisma.$executeRawUnsafe(
//     `TRUNCATE TABLE "turmas" RESTART IDENTITY CASCADE`
//   );
//   await prisma.$executeRawUnsafe(
//     `TRUNCATE TABLE "disciplinas" RESTART IDENTITY CASCADE`
//   );
//   await prisma.$executeRawUnsafe(
//     `TRUNCATE TABLE "professores" RESTART IDENTITY CASCADE`
//   );
//   await prisma.$executeRawUnsafe(
//     `TRUNCATE TABLE "professor_turmas" RESTART IDENTITY CASCADE`
//   );
//   await prisma.$executeRawUnsafe(
//     `TRUNCATE TABLE "alunos" RESTART IDENTITY CASCADE`
//   );

//   res.status(200).send("Limpeza concluida");
// });



router.post("/importar", upload.single("arquivo"), async (req, res) => {
  // const filePath = req.file?.path;
  const filePath = req.file?.buffer;
  console.log("req.file:", req.file);
  console.log("req.body:", req.body);
  if (!filePath) return res.status(400).send("Arquivo não enviado.");

  try {
    // const fileConteudo = await fs.promises.readFile(filePath, "utf-8");
    if (!req.file) return res.status(400).send("Arquivo não enviado ou inválido.");

    const fileConteudo = req.file?.buffer.toString("utf-8");
    const linhas = fileConteudo.split("\n");

    const senhaHash = await gerarHash();

    let todosOsDados: LinhaProcessada[] = [];

    const BATCH_TAMANHO = 350;
    let batchAtual: LinhaProcessada[] = [];

    let contadorSucesso = 0;
    let contadorFalhas = 0;

    for (let i = 0; i < linhas.length; i++) {
      try {
        const linha = linhas[i];

        const campos = linha.split("|");
        if (campos.length < 12) {
          // Mudei para 12 baseado no seu código
          console.log("Linha inválida ignorada:", campos);
          continue;
        }

        const [
          escolaCod, // 0
          raAluno, // 1
          nomeAluno, // 2
          anoLetivo, // 3
          serieRaw, // 4
          turnoRaw, // 5
          escolaId2, // 6 (igual ao campo 0)
          disciplinaCod, // 7
          disciplinaNome, // 8
          profCod, // 9
          profNome, //10
          profEmail, //11
        ] = campos;

        const serie = parseInt(serieRaw.trim());
        const turno = parseInt(turnoRaw.trim());

        batchAtual.push({
          escolaCod,
          raAluno,
          nomeAluno,
          serie,
          turno,
          disciplinaCod,
          disciplinaNome,
          profCod,
          profNome,
          profEmail,
        });

        todosOsDados.push({
          escolaCod,
          raAluno,
          nomeAluno,
          serie,
          turno,
          disciplinaCod,
          disciplinaNome,
          profCod,
          profNome,
          profEmail,
        });
        
        if (batchAtual.length >= BATCH_TAMANHO || i === linhas.length - 1) {
          console.log(`Processando batch de ${batchAtual.length} itens...`);

          await processarBatchOtimizado(batchAtual, senhaHash)
            .then(() => (contadorSucesso += batchAtual.length))
            .catch((err) => {
              console.error(`Erro no batch ${i / BATCH_TAMANHO}:`, err);
              contadorFalhas += batchAtual.length;
            });

          batchAtual = [];
        }
      } catch (error) {
        console.error(`Erro processando linha ${i + 1}:`, error);
        contadorFalhas++;
      }
    }

    await processarProfessorTurmaFinal(todosOsDados, senhaHash);

    // mais detalhado agr
    res.status(200).json({
      mensagem: "Importação concluída",
      totalLinhas: linhas.length,
      sucesso: contadorSucesso,
      falhas: contadorFalhas,
    });
  } catch (error) {
    console.error("Erro fatal na importação:", error);
    res.status(500).send("Erro durante a importação.");
  }
  // } finally {
  //   if (filePath) {
  //     fs.unlink(
  //       filePath,
  //       (err) => err && console.error("Erro ao deletar arquivo:", err)
  //     );
  //   }
  // }
});


export default router;
