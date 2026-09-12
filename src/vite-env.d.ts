/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** wss:// URL of the presence server (Ricehacks-mybuild-backend). Baked in at build time. */
  readonly VITE_PRESENCE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
