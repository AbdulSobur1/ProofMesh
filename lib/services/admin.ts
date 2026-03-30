export const isAdminUsername = (username: string | null | undefined) => {
  if (!username) return false

  const configured = (process.env.ADMIN_USERNAMES ?? 'grace')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  return configured.includes(username.trim().toLowerCase())
}
