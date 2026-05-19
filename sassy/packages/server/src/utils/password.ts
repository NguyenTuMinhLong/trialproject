/**
 * ============================================
 * PASSWORD VALIDATION - CHUẨN BẢO MẬT
 * ============================================
 * 
 * Validation rules:
 * - Ít nhất 8 ký tự
 * - Ít nhất 1 chữ hoa (A-Z)
 * - Ít nhất 1 chữ thường (a-z)
 * - Ít nhất 1 số (0-9)
 * - Ít nhất 1 ký tự đặc biệt (!@#$%^&*...)
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate password theo chuẩn bảo mật
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  if (!password) {
    return {
      isValid: false,
      errors: ['Mật khẩu không được để trống']
    };
  }

  // Kiểm tra độ dài tối thiểu
  if (password.length < 8) {
    errors.push('Mật khẩu phải có ít nhất 8 ký tự');
  }

  // Kiểm tra chữ hoa
  if (!/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ hoa (A-Z)');
  }

  // Kiểm tra chữ thường
  if (!/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ thường (a-z)');
  }

  // Kiểm tra số
  if (!/[0-9]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 số (0-9)');
  }

  // Kiểm tra ký tự đặc biệt
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Kiểm tra password có chứa thông tin cá nhân không
 * Giúp tránh password yếu như "John1990"
 */
export function containsPersonalInfo(password: string, name?: string, email?: string): boolean {
  const lowerPassword = password.toLowerCase();
  
  // Kiểm tra common passwords
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
    'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
    'bailey', 'passw0rd', 'shadow', '123123', '654321'
  ];
  
  if (commonPasswords.includes(lowerPassword)) {
    return true;
  }

  // Kiểm tra nếu có name/email
  if (name) {
    const lowerName = name.toLowerCase().replace(/\s/g, '');
    if (lowerName.length >= 3 && lowerPassword.includes(lowerName)) {
      return true;
    }
  }

  if (email) {
    const emailPrefix = email.split('@')[0].toLowerCase();
    if (emailPrefix.length >= 3 && lowerPassword.includes(emailPrefix)) {
      return true;
    }
  }

  return false;
}
