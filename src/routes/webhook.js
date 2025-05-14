import express from 'express';
import { handleWebhook } from '../controllers/webhookController.js';

const router = express.Router();
router.post('/document-upload-link', handleWebhook);
export default router;