import bcrypt from "bcryptjs";

const COST = 12;

export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (pw.length > 128) return "A senha deve ter no máximo 128 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(pw) || !/\d/.test(pw)) return "A senha deve conter letras e números.";
  return null;
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, COST);
}

export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

/** Hash fixo usado para equalizar o tempo de resposta quando o e-mail não existe. */
export const DUMMY_HASH = "$2b$12$6y5bNz.k46bYNmBytSRzXODeQ1T1R92d/ukmafrq1ym49Qela1jI2";
