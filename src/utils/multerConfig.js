import multer from 'multer';
import path from 'path';
import mime from 'mime-types';

export const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 15
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = {
            'atoNotice': ['.pdf', '.jpg', '.jpeg', '.png'],
            'profitLossStatement': ['.pdf', '.xls', '.xlsx'],
            'childSupportAssessment': ['.pdf', '.jpg', '.jpeg', '.png'],
            'bankStatements': ['.pdf'],
            'proofOfRent': ['.pdf', '.jpg', '.jpeg', '.png'],
            'identityDocument': ['.pdf', '.jpg', '.jpeg', '.png'],
            'payslip1': ['.pdf', '.jpg', '.jpeg'],
            'payslip2': ['.pdf', '.jpg', '.jpeg'],
            'payslip3': ['.pdf', '.jpg', '.jpeg'],
            'payslip4': ['.pdf', '.jpg', '.jpeg'],
            'centrelinkStatement': ['.pdf']
        };

        const fieldAllowedTypes = allowedTypes[file.fieldname];
        if (!fieldAllowedTypes) {
            return cb(new Error(`Invalid field name: ${file.fieldname}`), false);
        }

        const fileExt = path.extname(file.originalname).toLowerCase();
        const mimeType = mime.lookup(file.originalname);

        const allowedMimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };

        if (!fieldAllowedTypes.includes(fileExt)) {
            return cb(new Error(`Invalid file type for ${file.fieldname}. Allowed: ${fieldAllowedTypes.join(', ')}`), false);
        }

        const expectedMimeType = allowedMimeTypes[fileExt];
        if (mimeType !== expectedMimeType) {
            return cb(new Error(`File MIME type doesn't match extension for ${file.fieldname}`), false);
        }

        cb(null, true);
    }
}).any();


