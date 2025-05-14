import axios from 'axios';
import createError from 'http-errors';
import fetch from 'node-fetch';
import FormData from 'form-data';

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL;

// Create a shared axios instance with Auth header
const hubspotClient = axios.create({
  baseURL: 'https://api.hubapi.com/crm/v3/objects',
  headers: {
    Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
  },
});

// Fetch a contact by ID
export async function getContactById(id, properties = ['email', 'firstname', 'lastname']) {
  try {
    const resp = await hubspotClient.get(`/contacts/${id}`, {
      params: { properties: properties.join(',') },
    });
    return resp.data;
  } catch (err) {
    if (err.response?.status === 404) throw createError(404, 'Contact not found');
    throw err;
  }
}

// Search for a contact by email
export async function searchContactByEmail(email, properties = ['email']) {
  const payload = {
    filterGroups: [
      { filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }
    ],
    properties,
    limit: 1,
  };
  const resp = await hubspotClient.post('/contacts/search', payload);
  return resp.data.results?.[0] || null;
}

// Encode/decode portal payload
export function encodePortalPayload(payload) {
  const str = JSON.stringify(payload);
  return Buffer.from(str).toString('base64');
}

export function decodePortalPayload(encoded) {
  const json = Buffer.from(decodeURIComponent(encoded), 'base64').toString('utf-8');
  return JSON.parse(json);
}

// Generate a portal link for a contact
export function buildPortalLink(contact) {
  const payload = { id: contact.id, email: contact.properties?.email || contact.email };
  const encoded = encodePortalPayload(payload);
  return `${PORTAL_BASE_URL}/upload-documents?data=${encodeURIComponent(encoded)}`;
}


export async function uploadFilesToHubspot(files) {
  const uploadUrl = 'https://api.hubapi.com/files/v3/files';
  const headersBase = { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` };
  const fileIds = [];

  for (const file of files) {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size
    });
    form.append('options', JSON.stringify({ access: 'PRIVATE' }));
    form.append('folderPath', '/uploads');

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { ...headersBase, ...form.getHeaders() },
      body: form
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`File upload failed: ${text}`);
    }

    const body = await response.json();
    fileIds.push(body.id);
  }
  return fileIds;
}

// Create a NOTE engagement with file attachments
export async function createNoteWithAttachments(contactId, attachmentIds) {
  const payload = {
    engagement: { active: true, type: 'NOTE', timestamp: Date.now() },
    associations: { contactIds: [contactId] },
    metadata: { body: 'Please find the attached documents.' },
    attachments: attachmentIds.map(id => ({ id }))
  };

  const url = 'https://api.hubapi.com/engagements/v1/engagements';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Engagement create failed: ${text}`);
  }
  return resp.json();
}
