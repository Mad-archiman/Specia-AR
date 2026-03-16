const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generateAlphanumericCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
  }
  return code;
}
