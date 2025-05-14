
import multer from 'multer';

import { createNoteWithAttachments, decodePortalPayload, getContactById, uploadFilesToHubspot } from '../utils/hubspot_utils.js';

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

// Controller array for Express route
export const handleDocumentUpload = [
  upload,
  async (req, res, next) => {
    try {
      const contactId = req.body.contactId;
      if (!contactId) {
        return res.status(400).json({ error: 'Missing contactId' });
      }

      // Gather uploaded files
      const files = [];
      for (let i = 1; i <= 5; i++) {
        const arr = req.files[`document${i}`];
        if (arr && arr[0]) files.push(arr[0]);
      }
      if (!files.length) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Use util to upload files and get their IDs
      const fileIds = await uploadFilesToHubspot(files);
      console.log('Uploaded files:', fileIds);

      // Create a HubSpot note with attachments
      const engagement = await createNoteWithAttachments(contactId, fileIds);
      console.log('Created engagement:', engagement.id);

      res.json({ message: 'Files uploaded, note created, and associations made' });
    } catch (err) {
      next(err);
    }
  }
];

