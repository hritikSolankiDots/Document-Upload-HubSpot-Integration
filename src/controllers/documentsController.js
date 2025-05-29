import {
  validateTFN,
  validateEmail,
  validateAmount,
  validateRequired,
  validateSelect
} from '../utils/validators.js';

import { createNoteWithAttachments, decodePortalPayload, getContactById, updateContactProperties, uploadFiles } from '../utils/hubspot_utils.js';

export async function showUploadPage(req, res, next) {
  try {
    const { data: encoded } = req.query;
    if (!encoded) res.status(400).json({ error: 'Missing required query parameter: data' });

    const { id, email } = decodePortalPayload(encoded);
    if (!id || !email) res.status(400).json({ error: 'Payload missing id or email' });

    const hubspotData = await getContactById(id, ['email', 'firstname', 'lastname', 'financial_application_form_submitted', 'document_approved_status']);
    const contact = {
      id: hubspotData.id,
      email: hubspotData.properties.email,
      firstName: hubspotData.properties.firstname,
      lastName: hubspotData.properties.lastname,
      financial_application_form_submitted: hubspotData.properties.financial_application_form_submitted,
      document_approved_status: hubspotData.properties.document_approved_status,
    };
    res.render('upload-documents', { contact });
  } catch (err) {
    next(err);
  }
}

const ALLOWED_FIELDS = new Set([
  'atoNotice', 'profitLossStatement', 'childSupportAssessment',
  'bankStatements', 'proofOfRent', 'identityDocument',
  'payslip1', 'payslip2', 'payslip3', 'payslip4', 'centrelinkStatement'
]);

const FIELD_LABELS = {
  bankStatements: 'Bank statements',
  proofOfRent: 'Proof of rent',
  identityDocument: 'Identity document',
  childSupportAssessment: 'Child support assessment',
  payslip1: 'Payslip 1',
  payslip2: 'Payslip 2',
  payslip3: 'Payslip 3',
  payslip4: 'Payslip 4',
  centrelinkStatement: 'Centrelink statement',
  profitLossStatement: 'Profit & Loss statement'
};

const selectOptions = {
  owesATO: ['yes', 'no'],
  childSupportStatus: ['No child support', 'I receive child support', 'I pay child support'],
  employmentStatus: ['Employed', 'Self-employed', 'Centrelink only', 'Unemployed'],
  payslipFrequency: ['weekly', 'fortnightly', 'monthly'],
  identityType: [`Driver's Licence`, 'Passport', 'Proof-of-Age Card']
};

const buildRequiredFiles = ({ childSupportStatus, employmentStatus, payslipFrequency }) => {
  const required = new Set(['bankStatements', 'proofOfRent', 'identityDocument']);

  if (/receive|pay/.test(childSupportStatus.toLowerCase())) {
    required.add('childSupportAssessment');
  }
  switch (employmentStatus.toLowerCase()) {
    case 'employed':
      required.add('payslip1');
      required.add('payslip2');
      if (payslipFrequency === 'weekly') {
        required.add('payslip3');
        required.add('payslip4');
      }
      break;
    case 'centrelink only':
      required.add('centrelinkStatement');
      break;
    case 'self-employed':
      required.add('profitLossStatement');
      break;
    default:
      break;
  }
  return required;
};

export const handleDocumentUpload = async (req, res, next) => {
  try {
    const { body, files = [] } = req;
    const errors = [];

    // Destructure body fields for validation
    const {
      contactId,
      contactEmail,
      owesATO,
      childSupportStatus,
      employmentStatus,
      payslipFrequency,
      identityType,
      consent,
      tfn,
      atoDebtAmount
    } = body;

    // Basic validations
    errors.push(...[
      validateRequired(contactId, 'Contact ID'),
      validateEmail(contactEmail),
      validateSelect(owesATO, selectOptions.owesATO, 'ATO debt status'),
      validateSelect(childSupportStatus, selectOptions.childSupportStatus, 'Child support status'),
      validateSelect(employmentStatus, selectOptions.employmentStatus, 'Employment status'),
      validateSelect(identityType, selectOptions.identityType, 'Identity document type')
    ].filter(v => !v.isValid).map(v => ({ field: v.field, message: v.message })));

    if (consent !== 'on') {
      errors.push({ field: 'consent', message: 'You must agree to the terms to continue' });
    }

    // Conditional validations
    if (owesATO === 'yes') {
      const tfnVal = validateTFN(tfn);
      if (!tfnVal.isValid) errors.push({ field: 'tfn', message: tfnVal.message });

      const amtVal = validateAmount(atoDebtAmount);
      if (!amtVal.isValid) errors.push({ field: 'atoDebtAmount', message: amtVal.message });
    }

    if (employmentStatus === 'Employed') {
      const freqVal = validateSelect(payslipFrequency, selectOptions.payslipFrequency, 'Payslip frequency');
      if (!freqVal.isValid) errors.push({ field: 'payslipFrequency', message: freqVal.message });
    }

    // Filter allowed files
    const validFiles = files.filter(f => ALLOWED_FIELDS.has(f.fieldname));
    const uploadedFields = new Set(validFiles.map(f => f.fieldname));

    // Determine missing files
    const requiredFiles = buildRequiredFiles({ childSupportStatus, employmentStatus, payslipFrequency });
    requiredFiles.forEach(field => {
      if (!uploadedFields.has(field)) {
        errors.push({ field, message: `${FIELD_LABELS[field]} is required` });
      }
    });

    // File validations
    validFiles.forEach(file => {
      const maxMB = file.mimetype.startsWith('image/') ? 2 : 10;
      if (file.size > maxMB * 1024 * 1024) {
        errors.push({ field: file.fieldname, message: `File size must be less than ${maxMB}MB` });
      }
      if (file.size === 0) {
        errors.push({ field: file.fieldname, message: 'File appears to be empty or corrupted' });
      }
    });

    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', validationErrors: errors, message: 'Please fix the errors and try again' });
    }

    // Retrieve contact and build prefix
    const { properties: { firstname = 'Unknown', lastname = 'Contact', document_approved_status } = {} } = await getContactById(contactId, ['firstname', 'lastname', 'financial_application_form_submitted', 'document_approved_status']);
    const prefix = `${firstname.trim()}_${lastname.trim()}`.replace(/[^\w-]/g, '_').toLowerCase();

    if (document_approved_status === 'true') {
      return res.json({ success: false, message: 'This application has already been approved and cannot be submitted again.' });
    }

    // Prepare HubSpot properties
    const contactProps = {
      owes_ato: owesATO === 'yes',
      child_support_status: childSupportStatus,
      tfn: tfn || '',
      ato_debt_amount: atoDebtAmount || '',
      employment_status_client: employmentStatus,
      payslip_frequency: employmentStatus === 'Employed' ? payslipFrequency : '',
      identity_type: identityType,
      consent_confirmed: consent === 'on',
      payslip_uploaded: ['payslip1', 'payslip2', 'payslip3', 'payslip4'].some(f => uploadedFields.has(f)),
      centrelink_statement_uploaded: uploadedFields.has('centrelinkStatement'),
      pl_statement_uploaded: uploadedFields.has('profitLossStatement'),
      child_support_assessment_uploaded: uploadedFields.has('childSupportAssessment'),
      bank_statements_uploaded: uploadedFields.has('bankStatements'),
      proof_of_rent_uploaded: uploadedFields.has('proofOfRent'),
      identity_document_uploaded: uploadedFields.has('identityDocument'),
      ato_notice_uploaded: uploadedFields.has('atoNotice'),
      financial_application_form_submitted: true
    };

    await updateContactProperties(contactId, contactProps);
    const fileIds = await uploadFiles(validFiles, prefix, FIELD_LABELS);
    const note = await createNoteWithAttachments(contactId, fileIds);

    return res.json({ success: true, message: 'Application submitted successfully', filesUploaded: validFiles.length, note });

  } catch (err) {
    console.error('Upload error:', err);
    if (err.message.includes('Invalid file type')) {
      return res.status(400).json({ error: 'Invalid file type', message: err.message });
    }
    return res.status(500).json({ error: 'Internal server error', message: 'An error occurred while processing your application. Please try again later.' });
  }
};