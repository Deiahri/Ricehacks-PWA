/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** wss:// URL of the presence server (Ricehacks-mybuild-backend). Baked in at build time. */
  readonly VITE_PRESENCE_URL?: string;
  /** https:// URL of the same server's JSON API. Defaults to VITE_PRESENCE_URL with ws→http. */
  readonly VITE_API_URL?: string;
  /** Clerk publishable key (pk_…). Set: Google sign-in is required. Unset: guest mode on a device id (local dev). */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
