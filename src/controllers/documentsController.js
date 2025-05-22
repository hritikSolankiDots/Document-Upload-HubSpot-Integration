
import multer from 'multer';

import { createNoteWithAttachments, decodePortalPayload, getContactById, uploadFiles } from '../utils/hubspot_utils.js';

export async function showUploadPage(req, res, next) {
  try {
    const { data: encoded } = req.query;
    if (!encoded) res.status(400).json({ error: 'Missing required query parameter: data' });

    const { id, email } = decodePortalPayload(encoded);
    if (!id || !email) res.status(400).json({ error: 'Payload missing id or email' });

    const hubspotData = await getContactById(id, ['email', 'firstname', 'lastname']);
    const contact = {
      id: hubspotData.id,
      email: hubspotData.properties.email,
      firstName: hubspotData.properties.firstname,
      lastName: hubspotData.properties.lastname,
    };

    res.render('upload-documents', { contact });
  } catch (err) {
    next(err);
  }
}

// Multer setup for up to 5 documents
const upload = multer().fields([
  { name: 'document1' }, { name: 'document2' },
  { name: 'document3' }, { name: 'document4' },
  { name: 'document5' }
]);


export const handleDocumentUpload = [
  upload,
  async (req, res, next) => {
    try {
      const contactId = req.body.contactId;
      if (!contactId) return res.status(400).json({ error: 'Missing contactId' });

      const files = [];
      for (let i = 1; i <= 5; i++) {
        const arr = req.files[`document${i}`];
        if (arr && arr[0]) files.push(arr[0]);
      }
      if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

      // Step 1: upload
      const fileIds = await uploadFiles(files);

      // create note + attach files via Engagements API v1
      const note = await createNoteWithAttachments(contactId, fileIds);


      res.json({ message: 'Files uploaded, note created, and attachments associated', note });
    } catch (err) {
      next(err);
    }
  }
];


