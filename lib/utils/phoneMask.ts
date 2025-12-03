/**
 * Utility functions for phone number formatting (Brazilian format)
 */

/**
 * Formats a phone number to Brazilian format: (XX) XXXXX-XXXX
 * @param value - Raw phone number string
 * @returns Formatted phone number string
 */
export const formatPhone = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 11 digits (DDD + 9 digits)
  const limitedDigits = digits.slice(0, 11);
  
  // Apply mask based on length
  if (limitedDigits.length <= 2) {
    return limitedDigits.length > 0 ? `(${limitedDigits}` : '';
  } else if (limitedDigits.length <= 7) {
    return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2)}`;
  } else {
    return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2, 7)}-${limitedDigits.slice(7)}`;
  }
};

/**
 * Validates a Brazilian phone number
 * @param phone - Phone number string (can be formatted or raw)
 * @returns true if valid (10 or 11 digits), false otherwise
 */
export const validatePhone = (phone: string): boolean => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Brazilian phone numbers should have 10 (landline) or 11 (mobile) digits
  return digits.length === 10 || digits.length === 11;
};

/**
 * Removes formatting from phone number, returning only digits
 * @param phone - Formatted phone number
 * @returns Raw digits only
 */
export const unformatPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

