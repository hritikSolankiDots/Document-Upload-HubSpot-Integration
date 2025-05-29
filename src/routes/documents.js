import express from 'express';
import { showUploadPage, handleDocumentUpload } from '../controllers/documentsController.js';
import { upload } from '../utils/multerConfig.js';

const router = express.Router();


const companyInfo = {
  name: 'ACME Corporation',
  tagline: 'Innovating Your Future',
  description: 'ACME Corporation is a global leader in providing cutting‑edge solutions across technology, manufacturing, and services. Our mission is to drive sustainable growth through innovation and excellence.',
  address: {
    line1: '123 Innovation Drive',
    line2: 'Suite 100',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    country: 'Australia'
  },
  contact: {
    phone: '+61 2 1234 5678',
    email: 'info@acme-corp.com'
  }
};

// GET home page
router.get('/', (req, res) => {
  console.log("sfsfsafas");
  res.render('home', { company: companyInfo });
});

// When someone GETs /upload-documents?data=...
router.get('/upload-documents', showUploadPage);
router.post('/upload-documents', upload, handleDocumentUpload);

export default router;
