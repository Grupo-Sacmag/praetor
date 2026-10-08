// Lista cerrada de apps: nombre, carpeta y ejecutable exactos (no modificar).
export const APPS = {
  ACTAUTIL: { folder: "ACTAUTIL", exe: "ActaUtil17.exe" },
  ACUMULADO: { folder: "ACUMULADO", exe: "Acumulado.exe" },
  CAPTURA: { folder: "CAPTURA", exe: "Captura.exe" },
  DEPRECIACION: { folder: "DEPRECIACION", exe: "DEPREII.exe" },
  LIBROV: { folder: "LIBROV", exe: "LibroV.exe" },
  NOMINA: { folder: "NOMINA", exe: "Nomina.exe" },
  AUXILIARES: { folder: "AUXILIARES", exe: "Auxiliares.exe" },
  CONTROLAVC: { folder: "CONTROLAVC", exe: "CltAv.exe" },
} as const;

export type AppName = keyof typeof APPS;
export const APP_NAMES = Object.keys(APPS) as AppName[];

// Extensiones que Actualitodo filtra por regex en files_metadata.
export const TARIFA_EXT = ["03", "cre", "isr", "sub"];
export const INDICE_EXT = ["10", "200", "94"];
export const ALL_EXT = [...TARIFA_EXT, ...INDICE_EXT];

// Formato que escribe/compara el cliente (archivo {app}_version.txt): X.Y.Z
export const VERSION_RE = /^\d+\.\d+\.\d+$/;

export const CONTENT_TYPE = "application/octet-stream";

export const env = {
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017",
  db: process.env.MONGO_DB ?? "envarchdb",
  filesCol: process.env.FILES_COLLECTION ?? "files_metadata",
  versionsCol: process.env.VERSIONS_COLLECTION ?? "versions",
  adminsCol: process.env.ADMINS_COLLECTION ?? "admins",
  appsDir: process.env.APPS_DIR ?? "./uploads/apps",
  tarifasDir: process.env.TARIFAS_DIR ?? "./uploads/envArch",
  tarifasDbPath: process.env.TARIFAS_DB_PATH || "",
  cookieSecure: process.env.COOKIE_SECURE === "true",
};
