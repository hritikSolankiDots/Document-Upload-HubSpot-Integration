import { getContactById, searchContactByEmail, buildPortalLink } from '../utils/hubspot_utils.js';

export async function handleWebhook(req, res, next) {
  try {
    const { contact_id, email } = req.body;
    let contact = null;

    if (contact_id) {
      try {
        contact = await getContactById(contact_id, ['email']);
      } catch (err) {
        if (err.status === 404) console.log(`ID ${contact_id} not found; fallback to email.`);
        else throw err;
      }
    }

    if (!contact && email) {
      contact = await searchContactByEmail(email, ['email']);
    }
    if (!contact) return res.status(404).json({ error: 'Contact not found in HubSpot' });

    const portalLink = buildPortalLink(contact);
    return res.status(200).json({ data: { contact: { id: contact.id, email }, portalLink } });
  } catch (err) {
    next(err);
  }
}
