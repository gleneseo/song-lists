const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Whether `connectionString` points at a database on this machine. Anything
 * unparseable counts as not local, so a destructive script errs on the side
 * of refusing.
 */
function isLocalDatabase(connectionString: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(connectionString).hostname);
  } catch {
    return false;
  }
}

export { isLocalDatabase };
