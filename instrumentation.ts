// WatchDrama — server startup hooks (Phase 4).
//
// Next.js calls register() once when the production/dev server starts.
// Used here for one launch-safety check: in production, a missing
// ADMIN_PASSWORD means the admin panel silently falls back to the
// development password "admin123" — warn LOUDLY in the server log so it
// can't be missed in Docker / VPS logs. (The admin UI also shows a
// warning banner; this is the belt-and-braces copy for whoever deploys.)

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      [
        "",
        "╔══════════════════════════════════════════════════════════════╗",
        "║  WatchDrama SECURITY WARNING                                 ║",
        "║  ADMIN_PASSWORD is not set in production!                    ║",
        "║  The admin panel is using the development password           ║",
        "║  \"admin123\". Set ADMIN_PASSWORD in your .env and restart.    ║",
        "╚══════════════════════════════════════════════════════════════╝",
        "",
      ].join("\n")
    );
  }
  if (!process.env.USER_SESSION_SECRET) {
    console.warn(
      "[WatchDrama] USER_SESSION_SECRET is not set — viewer sessions are " +
        "signed with ADMIN_PASSWORD (or a development constant). Set a " +
        "long random USER_SESSION_SECRET before go-live."
    );
  }
}
