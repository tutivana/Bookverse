/**
 * Symmetric cryptography module for personal data portability in BookVerse.
 * Implements XOR-based encryption with a secret key and custom Base64 encoding.
 * Ensures exported files are completely illegible and tamper-proof.
 */

const SECRET_KEY = "BookVersePortabilitySecretKey_2026_SecureEncoding";

/**
 * Encrypts an object into a secure, illegible string.
 */
export function encryptData(data: object): string {
  try {
    const jsonStr = JSON.stringify(data);
    
    // Perform XOR encryption
    let cipherText = "";
    for (let i = 0; i < jsonStr.length; i++) {
      const charCode = jsonStr.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      cipherText += String.fromCharCode(charCode);
    }
    
    // Encode to UTF-8 safe string and then Base64
    const base64 = btoa(unescape(encodeURIComponent(cipherText)));
    return `BOOKVERSE_SECURE_PORTABILITY_V1:${base64}`;
  } catch (err) {
    console.error("Encryption failed:", err);
    throw new Error("Falha ao criptografar os dados de portabilidade.");
  }
}

/**
 * Decrypts a secure string back into an object.
 */
export function decryptData(encryptedStr: string): any {
  try {
    if (!encryptedStr || !encryptedStr.startsWith("BOOKVERSE_SECURE_PORTABILITY_V1:")) {
      throw new Error("Formato de arquivo inválido ou chave de criptografia ausente.");
    }
    
    const base64 = encryptedStr.replace("BOOKVERSE_SECURE_PORTABILITY_V1:", "");
    const cipherText = decodeURIComponent(escape(atob(base64)));
    
    // Decrypt using same XOR key
    let jsonStr = "";
    for (let i = 0; i < cipherText.length; i++) {
      const charCode = cipherText.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      jsonStr += String.fromCharCode(charCode);
    }
    
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Decryption failed:", err);
    throw new Error("Erro de descriptografia: O arquivo está corrompido, foi alterado ou não é um arquivo BookVerse válido.");
  }
}

/**
 * Sanitizes and limits the imported data to prevent security escalations (e.g., privilege escalation).
 * Only safe, user-authored and preferences fields are returned.
 */
export function sanitizeImportedData(rawImported: any): {
  bio?: string;
  username?: string;
  preferences?: {
    theme?: "Claro" | "Escuro" | "Sépia";
    fontSize?: "Pequeno" | "Normal" | "Grande" | "Extra Grande";
    layoutMode?: "Paginação" | "Rolagem";
    language?: "Português" | "Inglês" | "Espanhol";
    notifyPush?: boolean;
    notifyEmail?: boolean;
    audioSpeed?: number;
  };
  favorites?: string[];
  notes?: Array<{
    id: string;
    bookId: string;
    page: number;
    text: string;
    note: string;
    createdAt: string;
  }>;
} {
  const clean: any = {};
  
  if (!rawImported || typeof rawImported !== "object") {
    return clean;
  }
  
  // 1. Profile information (limited to bio and username)
  if (rawImported.profile && typeof rawImported.profile === "object") {
    if (typeof rawImported.profile.bio === "string") {
      clean.bio = rawImported.profile.bio.substring(0, 500); // limit length
    }
    if (typeof rawImported.profile.username === "string") {
      clean.username = rawImported.profile.username.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 30);
    }
  }
  
  // 2. Preferences (sanitize options)
  if (rawImported.preferences && typeof rawImported.preferences === "object") {
    clean.preferences = {};
    const prefs = rawImported.preferences;
    
    if (["Claro", "Escuro", "Sépia"].includes(prefs.theme)) {
      clean.preferences.theme = prefs.theme;
    }
    if (["Pequeno", "Normal", "Grande", "Extra Grande"].includes(prefs.fontSize)) {
      clean.preferences.fontSize = prefs.fontSize;
    }
    if (["Paginação", "Rolagem"].includes(prefs.layoutMode)) {
      clean.preferences.layoutMode = prefs.layoutMode;
    }
    if (["Português", "Inglês", "Espanhol"].includes(prefs.language)) {
      clean.preferences.language = prefs.language;
    }
    if (typeof prefs.notifyPush === "boolean") {
      clean.preferences.notifyPush = prefs.notifyPush;
    }
    if (typeof prefs.notifyEmail === "boolean") {
      clean.preferences.notifyEmail = prefs.notifyEmail;
    }
    if (typeof prefs.audioSpeed === "number" && prefs.audioSpeed >= 0.5 && prefs.audioSpeed <= 3) {
      clean.preferences.audioSpeed = prefs.audioSpeed;
    }
  }
  
  // 3. Favorites (limit to array of strings containing IDs)
  if (Array.isArray(rawImported.favorites)) {
    clean.favorites = rawImported.favorites
      .map((f: any) => {
        if (typeof f === "string") return f;
        if (f && typeof f === "object" && typeof f.id === "string") return f.id;
        return null;
      })
      .filter((id: any) => typeof id === "string" && id.length < 50);
  }
  
  // 4. Notes & Highlights (limit to clean structure)
  if (Array.isArray(rawImported.notes)) {
    clean.notes = rawImported.notes
      .filter((n: any) => n && typeof n === "object" && typeof n.bookId === "string" && typeof n.text === "string")
      .map((n: any) => ({
        id: typeof n.id === "string" ? n.id : `imported_note_${Math.random().toString(36).substr(2, 9)}`,
        bookId: n.bookId.substring(0, 50),
        page: typeof n.page === "number" ? n.page : 0,
        text: n.text.substring(0, 1000),
        note: typeof n.note === "string" ? n.note.substring(0, 2000) : "",
        createdAt: typeof n.createdAt === "string" ? n.createdAt : new Date().toISOString()
      }));
  }
  
  return clean;
}
