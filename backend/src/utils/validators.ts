/**
 * Validates email address format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates mobile number format (8 to 15 digits, optionally prefixed with +)
 */
export const isValidMobile = (mobile: string): boolean => {
  const mobileRegex = /^\+?[0-9]{8,15}$/;
  return mobileRegex.test(mobile);
};

/**
 * Validates strong password policy:
 * - At least 8 characters long
 * - Contains at least 1 uppercase letter
 * - Contains at least 1 lowercase letter
 * - Contains at least 1 numeric digit
 * - Contains at least 1 special character
 */
export const isStrongPassword = (password: string): boolean => {
  if (password.length < 8) return false;

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
};

/**
 * Validates Patient Registration Inputs
 */
export interface PatientRegistrationInput {
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  dob?: string;
  gender?: string;
  password?: string;
  confirmPassword?: string;
}

export const validatePatientRegistration = (input: PatientRegistrationInput): string[] => {
  const errors: string[] = [];

  if (!input.fullName || !input.fullName.trim()) {
    errors.push("Full Name is required.");
  }

  if (!input.email || !input.email.trim()) {
    errors.push("Email Address is required.");
  } else if (!isValidEmail(input.email)) {
    errors.push("Email Address format is invalid.");
  }

  if (!input.mobileNumber || !input.mobileNumber.trim()) {
    errors.push("Mobile Number is required.");
  } else if (!isValidMobile(input.mobileNumber)) {
    errors.push("Mobile Number must be a valid format (8-15 digits).");
  }

  if (!input.dob || !input.dob.trim()) {
    errors.push("Date of Birth is required.");
  }

  if (!input.gender || !["Male", "Female", "Other"].includes(input.gender)) {
    errors.push("Gender must be 'Male', 'Female', or 'Other'.");
  }

  if (!input.password) {
    errors.push("Password is required.");
  } else if (!isStrongPassword(input.password)) {
    errors.push("Password must be at least 8 characters long, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.");
  }

  if (input.password !== input.confirmPassword) {
    errors.push("Password and Confirm Password do not match.");
  }

  return errors;
};

/**
 * Validates Doctor Registration Inputs
 */
export interface DoctorRegistrationInput {
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  hospitalClinicName?: string;
  specialization?: string;
  password?: string;
  confirmPassword?: string;
}

export const validateDoctorRegistration = (input: DoctorRegistrationInput): string[] => {
  const errors: string[] = [];

  if (!input.fullName || !input.fullName.trim()) {
    errors.push("Full Name is required.");
  }

  if (!input.email || !input.email.trim()) {
    errors.push("Email Address is required.");
  } else if (!isValidEmail(input.email)) {
    errors.push("Email Address format is invalid.");
  }

  if (!input.mobileNumber || !input.mobileNumber.trim()) {
    errors.push("Mobile Number is required.");
  } else if (!isValidMobile(input.mobileNumber)) {
    errors.push("Mobile Number must be a valid format (8-15 digits).");
  }

  if (!input.hospitalClinicName || !input.hospitalClinicName.trim()) {
    errors.push("Hospital/Clinic Name is required.");
  }

  if (!input.specialization || !input.specialization.trim()) {
    errors.push("Specialization is required.");
  }

  if (!input.password) {
    errors.push("Password is required.");
  } else if (!isStrongPassword(input.password)) {
    errors.push("Password must be at least 8 characters long, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.");
  }

  if (input.password !== input.confirmPassword) {
    errors.push("Password and Confirm Password do not match.");
  }

  return errors;
};
