import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const basePrisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// Extensão com soft delete automático
const prismaWithSoftDelete = basePrisma.$extends({
  name: "soft-delete",
  query: {
    professorTurma: {
      // Interceptar queries de busca
      findMany({ args, query }) {
        // Só adiciona o filtro se não foi especificado explicitamente
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      findFirst({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      findUnique({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      count({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },

      update({ args, query }) {
        args.data = { ...args.data, atualizado_em: new Date() };
        return query(args);
      },
      updateMany({ args, query }) {
        args.data = { ...args.data, atualizado_em: new Date() };
        return query(args);
      },
    },
    aula: {
      findMany({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      findFirst({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      findUnique({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      count({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      update({ args, query }) {
        args.data = { ...args.data, atualizado_em: new Date() };
        return query(args);
      },
      updateMany({ args, query }) {
        args.data = { ...args.data, atualizado_em: new Date() };
        return query(args);
      },
    },
    frequencia: {
      findMany({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      findFirst({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      findUnique({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      count({ args, query }) {
        if (!args.where?.hasOwnProperty("ativo")) {
          args.where = { ...args.where, ativo: true };
        }
        return query(args);
      },
      update({ args, query }) {
        args.data = { ...args.data, atualizado_em: new Date() };
        return query(args);
      },
      updateMany({ args, query }) {
        args.data = { ...args.data, atualizado_em: new Date() };
        return query(args);
      },
    },
  },
});

export const prisma = globalForPrisma.prisma || prismaWithSoftDelete;
