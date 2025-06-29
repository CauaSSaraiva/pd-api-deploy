import express from 'express'
import cors from 'cors'

import importarRoutes from './routes/importar'
import loginRoutes from './routes/login'
import turmasRoutes from './routes/turmas'
import alunosRoutes from './routes/alunos'
import aulasRoutes from './routes/aulas'
import disciplinasRoutes from './routes/disciplinas'
import responsaveisRoutes from './routes/responsaveis'
import avisosRoutes from './routes/avisos'
const app = express()
const port = 3004

app.use(express.json())
app.use(cors())

app.use("/importar", importarRoutes)
app.use("/login", loginRoutes)
app.use("/turmas", turmasRoutes)
app.use("/alunos", alunosRoutes)
app.use("/aulas", aulasRoutes)
app.use("/disciplinas", disciplinasRoutes)
app.use("/responsaveis", responsaveisRoutes)
app.use("/avisos", avisosRoutes)


app.get('/', (req, res) => {
  res.send('API: Sistema do PD')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})

declare global {
  namespace Express {
    interface Request {
      user?: {
        userLogadoId: number;
        userLogadoNome: string;
        userLogadoPerfil: string;
      };
      // session?: any; prov n vai ser usado sessões mas enfim
    }
  }
}
