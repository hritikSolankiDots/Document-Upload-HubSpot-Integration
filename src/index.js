import express from 'express';
import "dotenv/config";
import path from 'path';
import { errorHandler } from './middlewares/errorHandler.js';
import webhookRouter from './routes/webhook.js';
import documentsRouter from './routes/documents.js';
const app = express();
const PORT = process.env.PORT || 3000;

// set up EJS
app.set('view engine', 'ejs');
app.set('views', path.resolve('./src/views'));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// webhook route
app.use('/webhook', webhookRouter);
app.use('/', documentsRouter);


// global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
