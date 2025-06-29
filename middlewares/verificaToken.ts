import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

interface TokenI {
  userLogadoId: number;
  userLogadoNome: string;
  userLogadoPerfil: string;
}

// Middleware de autenticação para qualquer usuário logado
export function verificaAutenticacao(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  const { authorization } = req.headers;

  console.log(authorization);

  if (!authorization) {
    return res.status(401).json({ error: "Token não informado" });
  }

  const token = authorization.split(" ")[1];

  try {
    const decode = jwt.verify(token, process.env.JWT_KEY as string) as TokenI;
    req.user = decode;

    console.log(req.user)

    // Passar para o próximo middleware, deixando caso precise depois
    // req.userLogadoId = xesquedele
    // req.userLogadoCargo = tomelhe

    next();
  } catch (error) {
    console.error("Erro na verificação do token:", token, error);
    return res.status(401).json({ error: "Token inválido" });
  }
}
