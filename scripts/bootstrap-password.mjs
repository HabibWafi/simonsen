export function bootstrapPassword(env = process.env) {
  const password = env.BOOTSTRAP_ADMIN_PASSWORD
  if (typeof password !== 'string' || password.trim().length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Set BOOTSTRAP_ADMIN_PASSWORD sepanjang minimal 12 karakter dan maksimal 72 byte UTF-8 sebelum setup.')
  }
  return password
}
