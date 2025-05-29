export const validateTFN = (tfn) => {
    if (!tfn) return { isValid: false, message: 'TFN is required' };
    const tfnRegex = /^[0-9]{8,9}$/;
    if (!tfnRegex.test(tfn)) return { isValid: false, message: 'TFN must be 8-9 digits only' };
    return { isValid: true };
};

export const validateEmail = (email) => {
    if (!email) return { isValid: false, message: 'Email is required' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return { isValid: false, message: 'Please enter a valid email address' };
    return { isValid: true };
};

export const validateAmount = (amount) => {
    if (!amount) return { isValid: false, message: 'Amount is required' };
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) return { isValid: false, message: 'Amount must be a positive number' };
    return { isValid: true };
};

export const validateRequired = (value, fieldName) => {
    if (!value || value.toString().trim() === '') return { isValid: false, message: `${fieldName} is required` };
    return { isValid: true };
};

export const validateSelect = (value, options, fieldName) => {
    if (!value) return { isValid: false, message: `${fieldName} is required` };
    if (!options.includes(value)) return { isValid: false, message: `Invalid ${fieldName} selection` };
    return { isValid: true };
};


