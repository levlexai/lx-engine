import express, { Request, Response } from 'express';
import cors from 'cors';

import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../apidoc.json';
// import inboundPhoneAgent from './routes/inboundPhoneAgent'
// import outboundPhoneAgent from './routes/outboundPhoneAgent'
import AgentOrchestrator from './routes/agent'
import { initTableManager } from './utils/tableManager';
import { initNotebookManager } from './utils/notebookManager';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req: Request, res: Response) => {
    res.send('Hello from the Levlex Agent Engine!');
});

// app.use("/phone", inboundPhoneAgent);
// app.use("/outbound", outboundPhoneAgent);
app.use('/agent', AgentOrchestrator)

// 1) Initialize the table manager *before* starting the server
initTableManager();
initNotebookManager();

// 2) Now that everything is ready, listen for incoming requests
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;