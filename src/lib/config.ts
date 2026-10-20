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

// Extensiones de tarifas e índices conocidas
export const TARIFA_EXT = ["03", "cre", "isr", "sub"];
export const INDICE_EXT = ["10", "200", "94", "nov", "tem"];
export const ALL_EXT = [...TARIFA_EXT, ...INDICE_EXT];

export type FileCategory = "tarifa" | "indice" | "desconocido";

/**
 * Clasifica un archivo en "tarifa", "indice" o "desconocido"
 * según los patrones y extensiones de Actualitodo (Fotos 1 y 2).
 */
export function classifyFile(fileName: string): FileCategory {
  const name = fileName.trim();
  const upper = name.toUpperCase();
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";

  // 1. Tarifas (Foto 1: CRE116.03, ISR177.03, SUB178.03, T7DIAS.*, Tab08Kin.*, Tab08Mes.*)
  if (["03", "cre", "isr", "sub"].includes(ext)) return "tarifa";
  if (/^(CRE|ISR|SUB|T7DIAS|TAB08)/i.test(upper)) return "tarifa";

  // 2. Índices (Foto 2: ARCHISO*, ContrDpn.Tem, DATOS, DEPAVAS*, INDICES.*, IndNPC10.exe, SOCTAS)
  if (/^(ARCHISO|CONTRDPN|DATOS|DEPAVAS|INDICES|INDNPC|SOCTAS)/i.test(upper)) return "indice";
  if (["10", "200", "94", "nov", "tem"].includes(ext)) return "indice";
  if (ext === "exe" && upper.startsWith("IND")) return "indice";

  return "desconocido";
}

// Formato que escribe/compara el cliente (archivo {app}_version.txt): X.Y.Z
export const VERSION_RE = /^\d+\.\d+\.\d+$/;

export const CONTENT_TYPE = "application/octet-stream";

const hostArchivos = process.env.HOST_ARCHIVOS_DIR ?? "/var/www/archivosACT";

export const env = {
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017",
  db: process.env.MONGO_DB ?? "actualizaciones",
  filesCol: process.env.FILES_COLLECTION ?? "files_metadata",
  versionsCol: process.env.VERSIONS_COLLECTION ?? "versions",
  adminsCol: process.env.ADMINS_COLLECTION ?? "admins",
  // Rutas internas del contenedor / proceso
  appsDir: process.env.APPS_DIR ?? "./uploads/archivosACT/aplicaciones",
  tarifasDir: process.env.TARIFAS_DIR ?? "./uploads/archivosACT/tarifas",
  indicesDir: process.env.INDICES_DIR ?? "./uploads/archivosACT/INDICES",
  // Rutas físicas en el servidor host para registrar en filePath de MongoDB
  hostAppsDir: process.env.HOST_APPS_DIR ?? `${hostArchivos}/aplicaciones`,
  hostTarifasDir: process.env.HOST_TARIFAS_DIR ?? `${hostArchivos}/tarifas`,
  hostIndicesDir: process.env.HOST_INDICES_DIR ?? `${hostArchivos}/INDICES`,
  tarifasDbPath: process.env.TARIFAS_DB_PATH || "",
  cookieSecure: process.env.COOKIE_SECURE === "true",
};
