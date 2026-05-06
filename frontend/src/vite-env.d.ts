/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMMIT_REF: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
