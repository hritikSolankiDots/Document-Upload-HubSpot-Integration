import axios from 'axios';
import createError from 'http-errors';
import FormData from 'form-data';

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
export async function getContactById(id, properties = ['email', 'firstname', 'lastname']) {
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
export async function uploadFiles(files) {
  const ids = [];

  for (const file of files) {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size,
    });
    form.append('options', JSON.stringify({ access: 'PRIVATE' }));
    form.append('folderPath', '/uploads');

    const response = await filesClient.post('', form, { headers: form.getHeaders() });
    ids.push(response.data.id);
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
