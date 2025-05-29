import axios from 'axios';
import createError from 'http-errors';
import FormData from 'form-data';
import path from 'path';

const { HUBSPOT_ACCESS_TOKEN, PORTAL_BASE_URL } = process.env;
if (!HUBSPOT_ACCESS_TOKEN) {
  throw new Error('Missing HUBSPOT_ACCESS_TOKEN in environment');
}

// Base Clients
const crmClient = axios.create({
  baseURL: 'https://api.hubapi.com/crm/v3/objects',
  headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
});

const filesClient = axios.create({
  baseURL: 'https://api.hubspot.com/files/v3/files',
  headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
});

const engagementsClient = axios.create({
  baseURL: 'https://api.hubspot.com/engagements/v1/engagements',
  headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
});

/**
 * Fetch a contact by its ID.
 */
export async function getContactById(id, properties = ['email', 'firstname', 'lastname', 'financial_application_form_submitted', 'document_approved_status']) {
  try {
    const { data } = await crmClient.get(`/contacts/${id}`, {
      params: { properties: properties.join(',') },
    });
    return data;
  } catch (err) {
    if (err.response?.status === 404) {
      throw createError(404, 'Contact not found');
    }
    throw err;
  }
}

/**
 * Update a contact's properties by ID.
 */
export async function updateContactProperties(contactId, properties = {}) {
  try {
    const payload = { properties };
    const { data } = await crmClient.patch(`/contacts/${contactId}`, payload);
    return data;
  } catch (err) {
    console.error('Contact update failed:', err.response?.status, err.response?.data);
    throw new Error(`Contact update error: ${err.response?.statusText || err.message}`);
  }
}

/**
 * Search for a contact by email address.
 */
export async function searchContactByEmail(email, properties = ['email']) {
  const payload = {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
    properties,
    limit: 1,
  };

  const { data } = await crmClient.post('/contacts/search', payload);
  return data.results?.[0] || null;
}

/**
 * Encode portal payload to a base64 query parameter.
 */
export const encodePortalPayload = payload =>
  Buffer.from(JSON.stringify(payload)).toString('base64');

/**
 * Decode portal payload from base64 query parameter.
 */
export const decodePortalPayload = encoded => {
  const json = Buffer.from(decodeURIComponent(encoded), 'base64').toString('utf-8');
  return JSON.parse(json);
};

/**
 * Build a secure portal link for document uploads
 */
export function buildPortalLink(contact) {
  const payload = { id: contact.id, email: contact.properties?.email || contact.email };
  const encoded = encodePortalPayload(payload);
  return `${PORTAL_BASE_URL}/upload-documents?data=${encodeURIComponent(encoded)}`;
}

/**
 * Upload files to HubSpot and return an array of file IDs.
 */

export async function uploadFiles(files, contactPrefix, fieldLabels = {}) {
  const ids = [];

  for (const file of files) {
    // derive a human-readable label for the field
    const label = fieldLabels[file.fieldname] || file.fieldname;
    // strip out bad chars, lowercase, replace spaces
    const baseName = path.basename(file.originalname);
    const safeName = `${contactPrefix}_${label}_${baseName}`
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const form = new FormData();
    form.append('file', file.buffer, {
      filename: safeName,
      contentType: file.mimetype,
      knownLength: file.size
    });
    form.append('options', JSON.stringify({ access: 'PRIVATE' }));
    form.append('folderPath', '/uploads');

    try {
      const response = await filesClient.post('', form, {
        headers: form.getHeaders()
      });
      ids.push(response.data.id);
    } catch (error) {
      console.error('File upload failed:', error.response?.status, error.response?.data);
      throw new Error(`File upload error: ${error.response?.statusText || error.message}`);
    }
  }

  return ids;
}

/**
 * Create a note engagement on a contact with optional attachments.
 */
export async function createNoteWithAttachments(contactId, attachmentIds = []) {
  const payload = {
    engagement: { active: true, type: 'NOTE', timestamp: Date.now() },
    associations: { contactIds: [contactId] },
    metadata: { body: 'Please find the attached documents.' },
    attachments: attachmentIds.map(id => ({ id })),
  };

  const { data } = await engagementsClient.post('', payload);
  return data;
}
