import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { Member, Invitation, NotificationLog, AppSettings, DatabaseStatus, Invoice, MemberCommissionSummary, Disbursement } from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory for local fallback persistence
const DATA_DIR = path.resolve(__dirname, '../data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'local_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface LocalSchema {
  members: Member[];
  invitations: Invitation[];
  notification_logs: NotificationLog[];
  invoices: Invoice[];
  disbursements: Disbursement[];
  settings: AppSettings;
}

export function hashPassword(plainText: string): string {
  return crypto.createHash('sha256').update(plainText.trim()).digest('hex');
}

const defaultSettings: AppSettings = {
  wa_gateway_url: process.env.WA_GATEWAY_URL || 'https://tiket.sayuti.com/api/gateway/send',
  wa_api_key: process.env.WA_API_KEY || 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU4NTU5MzFmLTllMWQtNDRkZC05YWI3LTg4ZTA2NTI4YTkxNiIsImVtYWlsIjoiYWRtaW5Ac2F5dXRpLmNvbSIsInRlbmFudElkIjoiZjY0YjZjYTAtNzM1Yi00MjQ0LTllZTktMWVmOTI2N2Q0YTFhIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzkxODg3OTIwLCJleHAiOjE3OTI0OTI3MjB9.BMUGJlV8MiCl1e1L2ZT6lxWLG3H691x6OtrhRe3BZRU',
  wa_device_id: process.env.WA_DEVICE_ID || '',
  community_name: 'Portal Sayuti.com',
  community_tagline: 'Wadah Kolaborasi, Inspirasi, dan Pertumbuhan Bersama',
  default_invite_message: 'Halo {name}! Anda mendapatkan undangan eksklusif untuk bergabung dengan {community}. Silakan lengkapi pendaftaran melalui tautan resmi 1-kali-pakai berikut: {link} . Terima kasih!',
  default_success_message: 'Selamat bergabung di {community}, {name}! Pendaftaran Anda telah berhasil diverifikasi. Nomor Referensi Unik Anggota Anda adalah: {reference_number}. Simpan nomor ini sebagai bukti identitas keanggotaan resmi Anda.',
  commission_rate_percent: 10,
  commission_calculation_mode: 'percentage',
  commission_fixed_amount: 50000,
  commission_description: 'Komisi referral diberikan untuk setiap transaksi yang berhasil dan telah berstatus lunas.',
  min_disbursement_amount: 25000,
};

function readLocalDb(): LocalSchema {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      const parsed: LocalSchema = JSON.parse(raw);
      if (!parsed.invoices) parsed.invoices = [];
      if (!parsed.disbursements) parsed.disbursements = [];
      if (!parsed.settings.commission_rate_percent) {
        parsed.settings = { ...defaultSettings, ...parsed.settings };
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading local db fallback:', err);
  }
  const initial: LocalSchema = {
    members: [],
    invitations: [],
    notification_logs: [],
    invoices: [],
    disbursements: [],
    settings: { ...defaultSettings },
  };
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
  return initial;
}

function writeLocalDb(data: LocalSchema): void {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local db fallback:', err);
  }
}

// MySQL connection parameters from user environment
const DB_HOST = process.env.DB_HOST || 'posapp.hostr.my.id';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USERNAME || 'db_print_new';
const DB_PASSWORD = process.env.DB_PASSWORD || 'sFN8bTrHHeGbzeAp';
const DB_NAME = process.env.DB_DATABASE || 'db_print_new';

let mysqlPool: mysql.Pool | null = null;
let mysqlConnected = false;
let lastMysqlError: string | null = null;

export function handleMysqlError(err: any, context: string): void {
  const code = err?.code || '';
  const msg = err?.message || '';
  if (
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EHOSTUNREACH' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ER_ACCESS_DENIED_ERROR' ||
    code === 'ER_CON_COUNT_ERROR' ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('connect ETIMEDOUT') ||
    msg.includes('Connection lost') ||
    msg.includes('closed')
  ) {
    mysqlConnected = false;
    lastMysqlError = `Koneksi MySQL terputus (${code || 'TIMEOUT'}): ${msg}`;
    console.warn(`[DB] MySQL terputus pada ${context} (${code || 'TIMEOUT'}). Mengalihkan operasi ke database lokal.`);
  } else {
    console.warn(`[DB] MySQL notice pada ${context}: [${code}] ${msg}`);
  }
}

export async function initDatabase(): Promise<DatabaseStatus> {
  try {
    console.log(`[DB] Attempting connection to MySQL: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}...`);
    
    mysqlPool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 8000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Test ping
    const connection = await mysqlPool.getConnection();
    console.log('[DB] MySQL Connected successfully!');
    connection.release();
    mysqlConnected = true;
    lastMysqlError = null;

    // Run migrations & column adaptations
    await runMysqlMigrations();

    return getDatabaseStatus();
  } catch (err: any) {
    mysqlConnected = false;
    lastMysqlError = err.message || 'Koneksi ke MySQL gagal';
    console.warn(`[DB] MySQL connection error: ${lastMysqlError}. Using robust local persistence engine.`);
    
    // Ensure local DB has seed if empty
    const local = readLocalDb();
    if (local.invitations.length === 0) {
      seedDemoData();
    }

    return getDatabaseStatus();
  }
}

export function getDatabaseStatus(): DatabaseStatus {
  return {
    isConnected: mysqlConnected,
    connectionType: mysqlConnected ? 'mysql' : 'local_fallback',
    message: mysqlConnected 
      ? `Terhubung ke MySQL di ${DB_HOST}:${DB_PORT} (DB: ${DB_NAME})` 
      : `Menggunakan Penyimpanan Lokal Terisolasi (${lastMysqlError || 'MySQL Egress / Firewall batasan jaringan'})`,
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    tablesVerified: true,
    tables: ['users_members', 'invitations', 'notification_logs', 'app_settings', 'invoice (tabel eksis)', 'disbursements'],
  };
}

export async function testMysqlDirect(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const testConnection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectTimeout: 5000,
      ssl: { rejectUnauthorized: false }
    });
    
    const [rows] = await testConnection.query('SELECT 1 + 1 AS test_calc, NOW() AS server_time');
    await testConnection.end();
    
    mysqlConnected = true;
    lastMysqlError = null;
    return {
      success: true,
      message: `Berhasil tersambung langsung ke MySQL di ${DB_HOST}:${DB_PORT}`,
      details: rows
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal tersambung ke MySQL (${err.code || 'TIMEOUT'}): ${err.message}`,
      details: err
    };
  }
}

export async function runMysqlMigrations(): Promise<{ success: boolean; message: string; executedQueries?: number }> {
  if (!mysqlPool || !mysqlConnected) {
    return { success: false, message: 'MySQL tidak terhubung saat ini. Skrip tersimpan di schema.sql' };
  }

  const queries = [
    `CREATE TABLE IF NOT EXISTS invitations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      token VARCHAR(64) NOT NULL,
      recipient_name VARCHAR(150) NOT NULL,
      recipient_phone VARCHAR(30) NOT NULL,
      status ENUM('pending', 'used', 'expired', 'revoked') NOT NULL DEFAULT 'pending',
      created_by VARCHAR(100) NOT NULL DEFAULT 'admin',
      expires_at DATETIME NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY idx_invitation_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS users_members (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      reference_number VARCHAR(50) NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      phone_number VARCHAR(30) NOT NULL,
      email VARCHAR(150) NULL,
      city VARCHAR(100) NULL,
      bio_interest TEXT NULL,
      invitation_id INT UNSIGNED NOT NULL,
      status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
      password_hash VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY idx_reference_number (reference_number),
      UNIQUE KEY idx_member_invitation_id (invitation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS notification_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      type ENUM('invite_link', 'registration_success', 'admin_alert', 'manual_test', 'disbursement_request', 'disbursement_approved', 'disbursement_rejected') NOT NULL,
      recipient_phone VARCHAR(30) NOT NULL,
      message_body TEXT NOT NULL,
      gateway_url VARCHAR(255) NOT NULL,
      http_status INT NULL,
      status ENUM('success', 'failed', 'pending') NOT NULL DEFAULT 'pending',
      response_payload TEXT NULL,
      error_message TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(100) NOT NULL,
      setting_value TEXT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS disbursements (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      disbursement_code VARCHAR(50) NOT NULL,
      member_id INT UNSIGNED NOT NULL,
      reference_number VARCHAR(50) NOT NULL,
      member_name VARCHAR(150) NOT NULL,
      member_phone VARCHAR(50) NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      bank_name VARCHAR(100) NOT NULL,
      account_number VARCHAR(100) NOT NULL,
      account_holder VARCHAR(150) NOT NULL,
      notes TEXT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      admin_notes TEXT NULL,
      transfer_proof_ref VARCHAR(100) NULL,
      processed_by VARCHAR(100) NULL,
      processed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY idx_disbursement_code (disbursement_code),
      KEY idx_disb_member (member_id),
      KEY idx_disb_ref (reference_number),
      KEY idx_disb_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  let executed = 0;
  for (const q of queries) {
    await mysqlPool.query(q);
    executed++;
  }

  // Pastikan kolom password_hash dan data rekening bank ada pada users_members
  try {
    await mysqlPool.query(`ALTER TABLE users_members ADD COLUMN password_hash VARCHAR(255) NULL AFTER status`);
    executed++;
  } catch {}

  try {
    await mysqlPool.query(`ALTER TABLE users_members ADD COLUMN bank_name VARCHAR(100) NULL AFTER password_hash`);
    executed++;
  } catch {}

  try {
    await mysqlPool.query(`ALTER TABLE users_members ADD COLUMN account_number VARCHAR(100) NULL AFTER bank_name`);
    executed++;
  } catch {}

  try {
    await mysqlPool.query(`ALTER TABLE users_members ADD COLUMN account_holder VARCHAR(150) NULL AFTER account_number`);
    executed++;
  } catch {}

  // PENTING: Menggunakan tabel eksis 'invoice' yang sudah ada di database MySQL (tidak membuat tabel baru).
  // Pastikan kolom nomor_referensi dan kolom komisi tersedia jika belum ada:
  try {
    await mysqlPool.query(`ALTER TABLE invoice MODIFY COLUMN nomor_referensi VARCHAR(50) NULL`);
    executed++;
  } catch {
    try { await mysqlPool.query(`ALTER TABLE invoice ADD COLUMN nomor_referensi VARCHAR(50) NULL`); executed++; } catch {}
  }

  try {
    await mysqlPool.query(`ALTER TABLE invoice ADD COLUMN customer_name VARCHAR(150) NULL`);
    executed++;
  } catch {}

  try {
    await mysqlPool.query(`ALTER TABLE invoice ADD COLUMN customer_phone VARCHAR(50) NULL`);
    executed++;
  } catch {}

  try {
    await mysqlPool.query(`ALTER TABLE invoice ADD COLUMN IF NOT EXISTS commission_rate_percent DECIMAL(5,2) NULL DEFAULT 10.00`);
    executed++;
  } catch {
    try { await mysqlPool.query(`ALTER TABLE invoice ADD COLUMN commission_rate_percent DECIMAL(5,2) NULL DEFAULT 10.00`); executed++; } catch {}
  }

  try {
    await mysqlPool.query(`ALTER TABLE invoice ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00`);
    executed++;
  } catch {
    try { await mysqlPool.query(`ALTER TABLE invoice ADD COLUMN commission_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00`); executed++; } catch {}
  }

  try {
    await mysqlPool.query(`ALTER TABLE invoice ADD COLUMN IF NOT EXISTS paid_at DATETIME NULL`);
    executed++;
  } catch {
    try { await mysqlPool.query(`ALTER TABLE invoice ADD COLUMN paid_at DATETIME NULL`); executed++; } catch {}
  }

  try {
    await mysqlPool.query(`CREATE INDEX idx_invoice_nomor_referensi ON invoice (nomor_referensi)`);
    executed++;
  } catch {}

  return { success: true, message: 'Tabel sistem dan tabel eksis invoice (kolom nomor_referensi) berhasil disinkronkan ke MySQL!', executedQueries: executed };
}

function seedDemoData(): void {
  const local = readLocalDb();
  if (local.invitations.length === 0) {
    const now = new Date().toISOString();
    local.invitations = [
      {
        id: 1,
        token: 'demo-undangan-spesial-01',
        recipient_name: 'Budi Santoso',
        recipient_phone: '081234567890',
        status: 'pending',
        created_by: 'Admin Utama',
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        used_at: null,
        created_at: now,
      },
      {
        id: 2,
        token: 'demo-undangan-terpakai-02',
        recipient_name: 'Siti Rahmawati',
        recipient_phone: '085712345678',
        status: 'used',
        created_by: 'Admin Utama',
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        used_at: now,
        created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        member_reference: 'REF-94812',
      }
    ];

    local.members = [
      {
        id: 1,
        reference_number: 'REF-94812',
        full_name: 'Siti Rahmawati',
        phone_number: '085712345678',
        email: 'siti.rahma@example.com',
        city: 'Bandung',
        bio_interest: 'Pemberdayaan sosial & literasi digital masyarakat',
        invitation_id: 2,
        status: 'active',
        password_hash: hashPassword('member123'),
        created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      }
    ];

    local.notification_logs = [
      {
        id: 1,
        type: 'invite_link',
        recipient_phone: '081234567890',
        message_body: 'Halo Budi Santoso! Anda mendapatkan undangan eksklusif bergabung di Komunitas Sinergi Nusantara...',
        gateway_url: 'https://wa.printpro.my.id/api/v1/messages/send',
        http_status: 200,
        status: 'success',
        response_payload: JSON.stringify({ status: 'sent', messageId: 'msg_98472918' }),
        created_at: now,
      }
    ];

    local.invoices = [
      {
        id: 1,
        invoice_number: 'INV-202610-001',
        nomor_referensi: 'REF-94812',
        reference_number: 'REF-94812',
        member_name: 'Siti Rahmawati',
        customer_name: 'CV Maju Lancar Sejahtera',
        customer_phone: '081399887766',
        description: 'Paket Merchandise & Branding Komunitas',
        total_amount: 1500000,
        commission_rate_percent: 10,
        commission_amount: 150000,
        status: 'lunas',
        paid_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 2,
        invoice_number: 'INV-202610-002',
        nomor_referensi: 'REF-94812',
        reference_number: 'REF-94812',
        member_name: 'Siti Rahmawati',
        customer_name: 'PT Sinar Abadi Kreatif',
        customer_phone: '085211223344',
        description: 'Layanan Cetak Buku Panduan & Brosur Event Komunitas',
        total_amount: 2800000,
        commission_rate_percent: 10,
        commission_amount: 280000,
        status: 'lunas',
        paid_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 3,
        invoice_number: 'INV-202610-003',
        nomor_referensi: 'REF-94812',
        reference_number: 'REF-94812',
        member_name: 'Siti Rahmawati',
        customer_name: 'Toko Berkah Usaha Mandiri',
        customer_phone: '087812349900',
        description: 'Spanduk Banner & Kemasan UMKM',
        total_amount: 850000,
        commission_rate_percent: 10,
        commission_amount: 85000,
        status: 'pending',
        paid_at: null,
        created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      }
    ];

    local.disbursements = [
      {
        id: 1,
        disbursement_code: 'WD-202610-1011',
        member_id: 1,
        reference_number: 'REF-94812',
        member_name: 'Siti Rahmawati',
        member_phone: '085712345678',
        amount: 100000,
        bank_name: 'BCA (Bank Central Asia)',
        account_number: '8830192831',
        account_holder: 'Siti Rahmawati',
        notes: 'Pencairan komisi referral transaksi Oktober',
        status: 'approved',
        admin_notes: 'Transfer berhasil via BCA Mobile. Terima kasih atas dedikasi dan kerja sama Anda!',
        transfer_proof_ref: 'TRX-BCA-202610-9841',
        processed_by: 'Admin Utama',
        processed_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
        created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      }
    ];

    writeLocalDb(local);
  }
}

// -----------------------------------------------------------------------------
// DATA REPOSITORY FUNCTIONS (Unified for MySQL & Local Fallback)
// -----------------------------------------------------------------------------

export async function getSettings(): Promise<AppSettings> {
  if (mysqlPool && mysqlConnected) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT setting_key, setting_value FROM app_settings');
      const settingsMap: any = { ...defaultSettings };
      for (const row of rows) {
        settingsMap[row.setting_key] = row.setting_value;
      }
      return settingsMap;
    } catch (e) {
      handleMysqlError(e, 'getSettings');
    }
  }
  const db = readLocalDb();
  return db.settings || defaultSettings;
}

export async function saveSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged: AppSettings = { ...current, ...newSettings };

  if (mysqlPool && mysqlConnected) {
    try {
      for (const [key, val] of Object.entries(merged)) {
        await mysqlPool.query(
          `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE setting_value = ?`,
          [key, val, val]
        );
      }
    } catch (e) {
      handleMysqlError(e, 'saveSettings');
    }
  }

  const db = readLocalDb();
  db.settings = merged;
  writeLocalDb(db);
  return merged;
}

export async function getAllInvitations(): Promise<Invitation[]> {
  if (mysqlPool && mysqlConnected) {
    try {
      const [rows]: any = await mysqlPool.query(`
        SELECT i.*, m.reference_number as member_reference 
        FROM invitations i
        LEFT JOIN users_members m ON i.id = m.invitation_id
        ORDER BY i.id DESC
      `);
      return rows;
    } catch (e) {
      handleMysqlError(e, 'getAllInvitations');
    }
  }
  const db = readLocalDb();
  return [...db.invitations].reverse();
}

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  if (mysqlPool && mysqlConnected) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM invitations WHERE token = ? LIMIT 1', [token]);
      if (rows.length > 0) return rows[0];
      return null;
    } catch (e) {
      handleMysqlError(e, 'getInvitationByToken');
    }
  }
  const db = readLocalDb();
  return db.invitations.find((inv) => inv.token === token) || null;
}

export async function createInvitation(data: {
  token: string;
  recipient_name: string;
  recipient_phone: string;
  created_by?: string;
  expires_in_days?: number;
}): Promise<Invitation> {
  const expiresAt = data.expires_in_days 
    ? new Date(Date.now() + data.expires_in_days * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  if (mysqlPool && mysqlConnected) {
    try {
      const [result]: any = await mysqlPool.query(
        `INSERT INTO invitations (token, recipient_name, recipient_phone, created_by, expires_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [data.token, data.recipient_name, data.recipient_phone, data.created_by || 'admin', expiresAt]
      );
      return {
        id: result.insertId,
        token: data.token,
        recipient_name: data.recipient_name,
        recipient_phone: data.recipient_phone,
        status: 'pending',
        created_by: data.created_by || 'admin',
        expires_at: expiresAt,
        used_at: null,
        created_at: new Date().toISOString(),
      };
    } catch (e) {
      handleMysqlError(e, 'createInvitation');
    }
  }

  const db = readLocalDb();
  const newInv: Invitation = {
    id: db.invitations.length > 0 ? Math.max(...db.invitations.map((i) => i.id)) + 1 : 1,
    token: data.token,
    recipient_name: data.recipient_name,
    recipient_phone: data.recipient_phone,
    status: 'pending',
    created_by: data.created_by || 'admin',
    expires_at: expiresAt,
    used_at: null,
    created_at: new Date().toISOString(),
  };
  db.invitations.push(newInv);
  writeLocalDb(db);
  return newInv;
}

export async function revokeInvitation(id: number): Promise<boolean> {
  if (mysqlPool && mysqlConnected) {
    try {
      await mysqlPool.query('UPDATE invitations SET status = "revoked" WHERE id = ? AND status = "pending"', [id]);
      return true;
    } catch (e) {
      handleMysqlError(e, 'revokeInvitation');
    }
  }
  const db = readLocalDb();
  const inv = db.invitations.find((i) => i.id === id);
  if (inv && inv.status === 'pending') {
    inv.status = 'revoked';
    writeLocalDb(db);
    return true;
  }
  return false;
}

export async function regenerateInvitationToken(
  id: number,
  expiresInDays: number = 7
): Promise<{ success: boolean; invitation?: Invitation; error?: string }> {
  const newToken = 'inv_' + crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  if (mysqlPool && mysqlConnected) {
    try {
      const [checkRows]: any = await mysqlPool.query('SELECT * FROM invitations WHERE id = ? LIMIT 1', [id]);
      if (!checkRows || checkRows.length === 0) {
        return { success: false, error: 'Undangan tidak ditemukan.' };
      }

      await mysqlPool.query(
        'UPDATE invitations SET token = ?, status = "pending", expires_at = ?, used_at = NULL WHERE id = ?',
        [newToken, expiresAt, id]
      );

      const [updatedRows]: any = await mysqlPool.query(
        `SELECT i.*, m.reference_number as member_reference 
         FROM invitations i
         LEFT JOIN users_members m ON i.id = m.invitation_id
         WHERE i.id = ? LIMIT 1`,
        [id]
      );

      return {
        success: true,
        invitation: updatedRows[0],
      };
    } catch (e) {
      handleMysqlError(e, 'regenerateInvitationToken');
    }
  }

  const db = readLocalDb();
  const invIndex = db.invitations.findIndex((i) => i.id === id);
  if (invIndex === -1) {
    return { success: false, error: 'Undangan tidak ditemukan dalam database.' };
  }

  const updatedInv: Invitation = {
    ...db.invitations[invIndex],
    token: newToken,
    status: 'pending',
    expires_at: new Date(Date.now() + expiresInDays * 24 * 3600 * 1000).toISOString(),
    used_at: null,
  };

  db.invitations[invIndex] = updatedInv;
  writeLocalDb(db);

  return {
    success: true,
    invitation: updatedInv,
  };
}

export async function getAllMembers(): Promise<Member[]> {
  if (mysqlPool && mysqlConnected) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM users_members ORDER BY id DESC');
      return rows;
    } catch (e) {
      handleMysqlError(e, 'getAllMembers');
    }
  }
  const db = readLocalDb();
  return [...db.members].reverse();
}

export async function registerNewMember(params: {
  token: string;
  full_name: string;
  phone_number: string;
  password?: string;
  email?: string;
  city?: string;
  bio_interest?: string;
}): Promise<{ success: boolean; member?: Member; error?: string }> {
  const invitation = await getInvitationByToken(params.token);
  if (!invitation) {
    return { success: false, error: 'Link undangan tidak ditemukan dalam sistem.' };
  }
  if (invitation.status === 'used') {
    return { success: false, error: 'Link undangan ini sudah pernah digunakan sebelumnya (1 link hanya berlaku untuk 1 pendaftaran).' };
  }
  if (invitation.status === 'revoked') {
    return { success: false, error: 'Undangan ini telah dibatalkan oleh pihak admin.' };
  }
  if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
    return { success: false, error: 'Link undangan ini telah melewati masa berlaku (kedaluwarsa).' };
  }

  if (!params.password || params.password.trim().length < 5) {
    return { success: false, error: 'Kata sandi minimal 5 karakter untuk keamanan akun Anda.' };
  }

  const passwordHash = hashPassword(params.password.trim());

  // Generate Unique Reference Number: REF-XXXXX (cukup 5 digit, contoh: REF-64248)
  let referenceNumber = '';
  const existingMembers = await getAllMembers();
  const existingRefs = new Set(existingMembers.map((m) => m.reference_number));
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `REF-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!existingRefs.has(candidate)) {
      referenceNumber = candidate;
      break;
    }
  }
  if (!referenceNumber) {
    referenceNumber = `REF-${Math.floor(10000 + Math.random() * 90000)}`;
  }
  const now = new Date().toISOString();

  if (mysqlPool && mysqlConnected) {
    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();

      // Mark invitation as used
      await conn.query('UPDATE invitations SET status = "used", used_at = NOW() WHERE id = ? AND status = "pending"', [invitation.id]);

      // Insert member with password_hash
      const [insertRes]: any = await conn.query(
        `INSERT INTO users_members (reference_number, full_name, phone_number, email, city, bio_interest, invitation_id, status, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [referenceNumber, params.full_name, params.phone_number, params.email || null, params.city || null, params.bio_interest || null, invitation.id, passwordHash]
      );

      await conn.commit();
      conn.release();

      const createdMember: Member = {
        id: insertRes.insertId,
        reference_number: referenceNumber,
        full_name: params.full_name,
        phone_number: params.phone_number,
        email: params.email || null,
        city: params.city || null,
        bio_interest: params.bio_interest || null,
        invitation_id: invitation.id,
        status: 'active',
        password_hash: passwordHash,
        created_at: now,
      };

      return { success: true, member: createdMember };
    } catch (err: any) {
      await conn.rollback();
      conn.release();
      console.error('MySQL transaction error in registerNewMember', err);
      return { success: false, error: `Gagal menyimpan ke database: ${err.message}` };
    }
  }

  // Local fallback
  const db = readLocalDb();
  const localInv = db.invitations.find((i) => i.id === invitation.id);
  if (!localInv || localInv.status !== 'pending') {
    return { success: false, error: 'Undangan tidak lagi berstatus aktif.' };
  }

  localInv.status = 'used';
  localInv.used_at = now;
  localInv.member_reference = referenceNumber;

  const newMember: Member = {
    id: db.members.length > 0 ? Math.max(...db.members.map((m) => m.id)) + 1 : 1,
    reference_number: referenceNumber,
    full_name: params.full_name,
    phone_number: params.phone_number,
    email: params.email || null,
    city: params.city || null,
    bio_interest: params.bio_interest || null,
    invitation_id: invitation.id,
    status: 'active',
    password_hash: passwordHash,
    created_at: now,
  };

  db.members.push(newMember);
  writeLocalDb(db);

  return { success: true, member: newMember };
}

export async function logNotification(data: {
  type: NotificationLog['type'];
  recipient_phone: string;
  message_body: string;
  gateway_url: string;
  http_status: number | null;
  status: 'success' | 'failed' | 'pending';
  response_payload?: string | null;
  error_message?: string | null;
}): Promise<NotificationLog> {
  const now = new Date().toISOString();

  if (mysqlPool && mysqlConnected) {
    try {
      const [res]: any = await mysqlPool.query(
        `INSERT INTO notification_logs (type, recipient_phone, message_body, gateway_url, http_status, status, response_payload, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.type, data.recipient_phone, data.message_body, data.gateway_url, data.http_status, data.status, data.response_payload || null, data.error_message || null]
      );
      return {
        id: res.insertId,
        ...data,
        created_at: now,
      };
    } catch (e) {
      handleMysqlError(e, 'logNotification');
    }
  }

  const db = readLocalDb();
  const newLog: NotificationLog = {
    id: db.notification_logs.length > 0 ? Math.max(...db.notification_logs.map((l) => l.id)) + 1 : 1,
    ...data,
    created_at: now,
  };
  db.notification_logs.push(newLog);
  writeLocalDb(db);
  return newLog;
}

export async function getNotificationLogs(): Promise<NotificationLog[]> {
  if (mysqlPool && mysqlConnected) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM notification_logs ORDER BY id DESC LIMIT 100');
      return rows;
    } catch (e) {
      handleMysqlError(e, 'getNotificationLogs');
    }
  }
  const db = readLocalDb();
  return [...db.notification_logs].reverse();
}

export async function getDashboardStats(): Promise<any> {
  const invitations = await getAllInvitations();
  const members = await getAllMembers();
  const logs = await getNotificationLogs();
  const invoices = await getAllInvoices();
  const disbursements = await getAllDisbursements();

  const totalMembers = members.length;
  const activeInvitations = invitations.filter((i) => i.status === 'pending').length;
  const usedInvitations = invitations.filter((i) => i.status === 'used').length;
  const totalInvitations = invitations.length;

  const successfulNotifications = logs.filter((l) => l.status === 'success').length;
  const failedNotifications = logs.filter((l) => l.status === 'failed').length;

  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((i) => i.status === 'lunas');
  const totalPaidInvoices = paidInvoices.length;
  const totalCommissionPaid = paidInvoices.reduce(
    (acc, curr) => acc + (Number(curr.commission_amount) || 0),
    0
  );

  const pendingDisbursements = disbursements.filter((d) => d.status === 'pending').length;
  const approvedDisbursements = disbursements.filter((d) => d.status === 'approved');
  const totalDisbursedAmount = approvedDisbursements.reduce(
    (acc, d) => acc + (Number(d.amount) || 0),
    0
  );

  return {
    totalMembers,
    activeInvitations,
    usedInvitations,
    totalInvitations,
    totalNotifications: logs.length,
    successfulNotifications,
    failedNotifications,
    totalInvoices,
    totalPaidInvoices,
    totalCommissionPaid,
    totalDisbursements: disbursements.length,
    pendingDisbursements,
    totalDisbursedAmount,
    recentMembers: members.slice(0, 5),
    recentLogs: logs.slice(0, 5),
    recentInvoices: invoices.slice(0, 5),
    recentDisbursements: disbursements.slice(0, 5),
  };
}

// -----------------------------------------------------------------------------
// Authentication Helpers (Admin & Members)
// -----------------------------------------------------------------------------

export async function validateAdminCredentials(username: string, pass: string): Promise<boolean> {
  const settings: any = await getSettings();
  const configuredUser = settings.admin_username || 'admin';
  const configuredPass = settings.admin_password || 'admin123';
  return username.trim() === configuredUser && pass === configuredPass;
}

export async function findMemberForLogin(identifier: string): Promise<Member | null> {
  const cleanId = identifier.trim();
  const digitsOnly = cleanId.replace(/\D/g, '');

  if (mysqlPool && mysqlConnected) {
    try {
      const [rows]: any = await mysqlPool.query(
        `SELECT * FROM users_members 
         WHERE reference_number = ? 
            OR phone_number = ? 
            OR phone_number = ? 
            OR phone_number = ?
         LIMIT 1`,
        [cleanId, cleanId, '0' + digitsOnly.replace(/^62/, ''), '62' + digitsOnly.replace(/^0/, '')]
      );
      if (rows.length > 0) return rows[0];
    } catch (e) {
      handleMysqlError(e, 'findMemberForLogin');
    }
  }

  const db = readLocalDb();
  return (
    db.members.find((m) => {
      const mDigits = m.phone_number.replace(/\D/g, '');
      return (
        m.reference_number.toLowerCase() === cleanId.toLowerCase() ||
        m.phone_number === cleanId ||
        (digitsOnly && mDigits === digitsOnly) ||
        (digitsOnly.length >= 8 && mDigits.endsWith(digitsOnly))
      );
    }) || null
  );
}

export async function updateMemberProfile(
  memberId: number,
  data: {
    email?: string;
    city?: string;
    bio_interest?: string;
    bank_name?: string;
    account_number?: string;
    account_holder?: string;
  }
): Promise<Member | null> {
  if (mysqlPool && mysqlConnected) {
    try {
      await mysqlPool.query(
        `UPDATE users_members 
         SET email = COALESCE(?, email), 
             city = COALESCE(?, city), 
             bio_interest = COALESCE(?, bio_interest),
             bank_name = COALESCE(?, bank_name),
             account_number = COALESCE(?, account_number),
             account_holder = COALESCE(?, account_holder)
         WHERE id = ?`,
        [
          data.email !== undefined ? data.email : null,
          data.city !== undefined ? data.city : null,
          data.bio_interest !== undefined ? data.bio_interest : null,
          data.bank_name !== undefined ? data.bank_name : null,
          data.account_number !== undefined ? data.account_number : null,
          data.account_holder !== undefined ? data.account_holder : null,
          memberId
        ]
      );
      const [rows]: any = await mysqlPool.query('SELECT * FROM users_members WHERE id = ?', [memberId]);
      if (rows.length > 0) return rows[0];
    } catch (e) {
      handleMysqlError(e, 'updateMemberProfile');
    }
  }

  const db = readLocalDb();
  const mem = db.members.find((m) => m.id === memberId);
  if (mem) {
    if (data.email !== undefined) mem.email = data.email;
    if (data.city !== undefined) mem.city = data.city;
    if (data.bio_interest !== undefined) mem.bio_interest = data.bio_interest;
    if (data.bank_name !== undefined) mem.bank_name = data.bank_name;
    if (data.account_number !== undefined) mem.account_number = data.account_number;
    if (data.account_holder !== undefined) mem.account_holder = data.account_holder;
    mem.updated_at = new Date().toISOString();
    writeLocalDb(db);
    return mem;
  }
  return null;
}

export async function authenticateMember(
  identifier: string,
  plainPassword?: string
): Promise<{ success: boolean; member?: Member; error?: string }> {
  const member = await findMemberForLogin(identifier);
  if (!member) {
    return {
      success: false,
      error: 'Data anggota tidak ditemukan. Pastikan Nomor Referensi (contoh: REF-KOM-2026-94812) atau Nomor WhatsApp sudah benar.',
    };
  }

  if (!plainPassword || !plainPassword.trim()) {
    return {
      success: false,
      error: 'Kata sandi wajib diisi untuk login akun anggota.',
    };
  }

  // Load password strictly from database
  let dbHash = member.password_hash;
  if (!dbHash) {
    // If account was created before password hash migration, initialize with default secure hash '123456'
    dbHash = hashPassword('123456');
    await updateMemberPassword(member.id, '123456');
    member.password_hash = dbHash;
  }

  const inputHash = hashPassword(plainPassword.trim());
  if (dbHash !== inputHash && dbHash !== plainPassword.trim()) {
    return {
      success: false,
      error: 'Kata sandi salah! Password tidak cocok dengan data database akun Anda. Silakan coba kembali atau gunakan Login dengan Token.',
    };
  }

  return { success: true, member };
}

export async function authenticateMemberByToken(
  token: string
): Promise<{ success: boolean; member?: Member; error?: string }> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { success: false, error: 'Token akses / pendaftaran wajib diisi.' };
  }

  // 1. Look up invitation by token
  const invitation = await getInvitationByToken(cleanToken);
  const allMembers = await getAllMembers();

  if (invitation) {
    // Look up by invitation_id
    let member = allMembers.find((m) => m.invitation_id === invitation.id);
    if (!member && invitation.member_reference) {
      member = allMembers.find((m) => m.reference_number.toLowerCase() === invitation.member_reference?.toLowerCase());
    }
    if (!member) {
      const cleanDigits = invitation.recipient_phone.replace(/\D/g, '');
      member = allMembers.find((m) => m.phone_number.replace(/\D/g, '').endsWith(cleanDigits));
    }

    if (member) {
      return { success: true, member };
    }
  }

  // 2. Also check if cleanToken matches any member reference number
  const directMember = allMembers.find(
    (m) => m.reference_number.toLowerCase() === cleanToken.toLowerCase()
  );
  if (directMember) {
    return { success: true, member: directMember };
  }

  return {
    success: false,
    error: 'Token akses tidak valid atau tidak terhubung ke akun anggota manapun. Silakan periksa kembali kode token undangan Anda.',
  };
}

export async function updateMemberPassword(memberId: number, newPlainPassword: string): Promise<boolean> {
  const newHash = hashPassword(newPlainPassword.trim());
  if (mysqlPool && mysqlConnected) {
    try {
      await mysqlPool.query('UPDATE users_members SET password_hash = ? WHERE id = ?', [newHash, memberId]);
      return true;
    } catch (e) {
      handleMysqlError(e, 'updateMemberPassword');
    }
  }

  const db = readLocalDb();
  const mem = db.members.find((m) => m.id === memberId);
  if (mem) {
    mem.password_hash = newHash;
    writeLocalDb(db);
    return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// Invoices & Member Commissions Management
// ATURAN: Komisi HANYA tampil dan dihitung aktif jika status order 'lunas'
// -----------------------------------------------------------------------------

export async function getAllInvoices(filter?: { reference_number?: string; nomor_referensi?: string; status?: string }): Promise<Invoice[]> {
  const targetRef = (filter?.nomor_referensi || filter?.reference_number || '').trim();

  if (mysqlPool && mysqlConnected) {
    try {
      let query = `
        SELECT 
          i.id_invoice AS id,
          COALESCE(i.id_sub_invoice, CONCAT('INV-', i.id_invoice)) AS invoice_number,
          i.nomor_referensi,
          COALESCE(i.customer_name, k.nama, 'Pelanggan') AS customer_name,
          COALESCE(i.customer_phone, k.telp, '') AS customer_phone,
          COALESCE(i.keterangan, i.catatan, '') AS description,
          COALESCE(i.total_bayar, i.total_order, 0) AS total_amount,
          COALESCE(i.commission_rate_percent, 10.00) AS commission_rate_percent,
          COALESCE(i.commission_amount, 0.00) AS commission_amount,
          CASE 
            WHEN i.lunas = 'Y' THEN 'lunas'
            WHEN i.oto = 'batal' THEN 'batal'
            ELSE 'pending'
          END AS status,
          i.paid_at,
          COALESCE(i.createDate, i.tgl_invoice, NOW()) AS created_at
        FROM invoice i
        LEFT JOIN konsumen k ON i.id_konsumen = k.id_konsumen
      `;
      const params: any[] = [];
      if (targetRef) {
        query += ' WHERE i.nomor_referensi = ?';
        params.push(targetRef);
      } else {
        // PERMINTAAN USER: invoice yang ditampilkan HANYA yang memiliki nomor_referensi, jika kosong jangan ditampilkan
        query += ` WHERE i.nomor_referensi IS NOT NULL 
                   AND TRIM(CAST(i.nomor_referensi AS CHAR)) != '' 
                   AND TRIM(CAST(i.nomor_referensi AS CHAR)) != '0'`;
      }
      query += ' ORDER BY i.id_invoice DESC LIMIT 250';
      const [rows]: any = await mysqlPool.query(query, params);

      // Lookup member names for reference numbers
      const members = await getAllMembers();
      const memberMap = new Map<string, string>();
      for (const m of members) {
        memberMap.set(m.reference_number.toLowerCase(), m.full_name);
      }

      let mapped: Invoice[] = rows.map((r: any) => {
        const idVal = Number(r.id);
        const invNumber = String(r.invoice_number);
        const refVal = String(r.nomor_referensi ?? '');
        const totalVal = Number(r.total_amount) || 0;
        const commRate = Number(r.commission_rate_percent) || 10;
        let commAmount = Number(r.commission_amount) || 0;
        if (commAmount === 0 && totalVal > 0) {
          commAmount = Math.round((totalVal * commRate) / 100);
        }

        return {
          id: idVal,
          invoice_number: invNumber,
          nomor_referensi: refVal,
          reference_number: refVal,
          member_name: memberMap.get(refVal.toLowerCase()) || null,
          customer_name: String(r.customer_name || 'Pelanggan'),
          customer_phone: r.customer_phone ? String(r.customer_phone) : null,
          description: r.description ? String(r.description) : null,
          total_amount: totalVal,
          commission_rate_percent: commRate,
          commission_amount: commAmount,
          status: r.status as 'lunas' | 'pending' | 'batal',
          paid_at: r.paid_at ? new Date(r.paid_at).toISOString() : null,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        };
      });

      // Filter ketat: Hanya tampilkan yang memiliki nomor_referensi valid
      mapped = mapped.filter((inv) => {
        const ref = (inv.nomor_referensi || inv.reference_number || '').trim();
        return ref !== '' && ref !== '0';
      });

      if (filter?.status) {
        mapped = mapped.filter((inv) => inv.status === filter.status);
      }

      return mapped;
    } catch (e: any) {
      handleMysqlError(e, 'getAllInvoices on table invoice');
    }
  }

  const db = readLocalDb();
  // Filter ketat fallback: Hanya invoice yang memiliki nomor_referensi
  let list = (db.invoices || []).filter((inv) => {
    const ref = (inv.nomor_referensi || inv.reference_number || '').trim();
    return ref !== '' && ref !== '0';
  });
  if (targetRef) {
    const term = targetRef.toLowerCase();
    list = list.filter((inv) => (inv.nomor_referensi || inv.reference_number || '').toLowerCase() === term);
  }
  if (filter?.status) {
    list = list.filter((inv) => inv.status === filter.status);
  }
  return [...list].sort((a, b) => b.id - a.id);
}

export async function getInvoicesByReference(referenceNumber: string): Promise<Invoice[]> {
  return getAllInvoices({ reference_number: referenceNumber, nomor_referensi: referenceNumber });
}

export async function getMemberCommissionSummary(referenceNumber: string): Promise<MemberCommissionSummary> {
  const member = await findMemberForLogin(referenceNumber);
  const memberName = member ? member.full_name : referenceNumber;

  const invoices = await getInvoicesByReference(referenceNumber);
  const disbursements = await getAllDisbursements({ reference_number: referenceNumber });

  // KETENTUAN UTAMA:
  // Komisi hanya tampil / aktif jika status order 'lunas'!
  let totalEarnedCommission = 0;
  let pendingCommission = 0;
  let paidInvoicesCount = 0;
  let pendingInvoicesCount = 0;
  let totalReferralSales = 0;

  for (const inv of invoices) {
    if (inv.status === 'lunas') {
      totalEarnedCommission += Number(inv.commission_amount) || 0;
      totalReferralSales += Number(inv.total_amount) || 0;
      paidInvoicesCount += 1;
    } else if (inv.status === 'pending') {
      pendingCommission += Number(inv.commission_amount) || 0;
      pendingInvoicesCount += 1;
    }
  }

  // Hitung akumulasi pencairan
  let disbursedAmount = 0;
  let pendingDisbursementAmount = 0;

  for (const d of disbursements) {
    if (d.status === 'approved') {
      disbursedAmount += Number(d.amount) || 0;
    } else if (d.status === 'pending') {
      pendingDisbursementAmount += Number(d.amount) || 0;
    }
  }

  // Sisa saldo komisi yang benar-benar siap dicairkan
  const availableBalance = Math.max(0, totalEarnedCommission - (disbursedAmount + pendingDisbursementAmount));

  return {
    reference_number: referenceNumber,
    member_name: memberName,
    totalEarnedCommission,
    pendingCommission,
    paidInvoicesCount,
    pendingInvoicesCount,
    totalReferralSales,
    disbursedAmount,
    pendingDisbursementAmount,
    availableBalance,
    invoices,
    disbursements,
  };
}

export async function createInvoice(data: {
  invoice_number?: string;
  reference_number?: string;
  nomor_referensi?: string;
  customer_name: string;
  customer_phone?: string;
  description?: string;
  total_amount: number;
  commission_rate_percent?: number;
  commission_amount?: number;
  status?: 'lunas' | 'pending' | 'batal';
}): Promise<Invoice> {
  const settings = await getSettings();
  const rate = Number(data.commission_rate_percent ?? settings.commission_rate_percent ?? 10);
  const totalAmount = Number(data.total_amount) || 0;
  const refNum = (data.nomor_referensi || data.reference_number || '').trim();

  let commissionAmount = 0;
  if (data.commission_amount !== undefined) {
    commissionAmount = Number(data.commission_amount);
  } else if (settings.commission_calculation_mode === 'fixed') {
    commissionAmount = Number(settings.commission_fixed_amount) || 50000;
  } else {
    commissionAmount = Math.round((totalAmount * rate) / 100);
  }

  const status = data.status || 'pending';
  const isPaid = status === 'lunas';
  const now = new Date().toISOString();
  const paidAt = isPaid ? now : null;

  const invoiceNumber =
    data.invoice_number?.trim() ||
    `INV-${Date.now().toString().slice(-8)}`;

  // Find member full_name
  const member = await findMemberForLogin(refNum);
  const memberName = member ? member.full_name : null;

  if (mysqlPool && mysqlConnected) {
    try {
      const [res]: any = await mysqlPool.query(
        `INSERT INTO invoice (
          id_sub_invoice, 
          nomor_referensi, 
          customer_name, 
          customer_phone, 
          keterangan, 
          total_bayar, 
          total_order, 
          commission_rate_percent, 
          commission_amount, 
          lunas, 
          oto, 
          paid_at, 
          createDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          invoiceNumber,
          refNum,
          data.customer_name.trim(),
          data.customer_phone?.trim() || null,
          data.description?.trim() || null,
          totalAmount,
          totalAmount,
          rate,
          commissionAmount,
          isPaid ? 'Y' : 'N',
          status === 'batal' ? 'batal' : (isPaid ? 'save' : 'pending'),
          paidAt ? paidAt.slice(0, 19).replace('T', ' ') : null,
        ]
      );

      return {
        id: res.insertId,
        invoice_number: invoiceNumber,
        nomor_referensi: refNum,
        reference_number: refNum,
        member_name: memberName,
        customer_name: data.customer_name.trim(),
        customer_phone: data.customer_phone?.trim() || null,
        description: data.description?.trim() || null,
        total_amount: totalAmount,
        commission_rate_percent: rate,
        commission_amount: commissionAmount,
        status: status,
        paid_at: paidAt,
        created_at: now,
      };
    } catch (e) {
      handleMysqlError(e, 'createInvoice on table invoice');
    }
  }

  const db = readLocalDb();
  if (!db.invoices) db.invoices = [];
  const newInv: Invoice = {
    id: db.invoices.length > 0 ? Math.max(...db.invoices.map((i) => i.id)) + 1 : 1,
    invoice_number: invoiceNumber,
    nomor_referensi: refNum,
    reference_number: refNum,
    member_name: memberName,
    customer_name: data.customer_name.trim(),
    customer_phone: data.customer_phone?.trim() || null,
    description: data.description?.trim() || null,
    total_amount: totalAmount,
    commission_rate_percent: rate,
    commission_amount: commissionAmount,
    status: status,
    paid_at: paidAt,
    created_at: now,
  };
  db.invoices.push(newInv);
  writeLocalDb(db);
  return newInv;
}

export async function updateInvoiceStatus(
  id: number,
  status: 'lunas' | 'pending' | 'batal'
): Promise<Invoice | null> {
  const now = new Date().toISOString();
  const isPaid = status === 'lunas';
  const paidAt = isPaid ? now : null;

  if (mysqlPool && mysqlConnected) {
    try {
      await mysqlPool.query(
        `UPDATE invoice 
         SET lunas = ?, 
             oto = ?, 
             paid_at = ?, 
             tanggal_up = NOW() 
         WHERE id_invoice = ?`,
        [
          isPaid ? 'Y' : 'N',
          status === 'batal' ? 'batal' : (isPaid ? 'save' : 'pending'),
          paidAt ? paidAt.slice(0, 19).replace('T', ' ') : null,
          id
        ]
      );
      const rows = await getAllInvoices();
      const updated = rows.find((r) => r.id === id);
      if (updated) return updated;
    } catch (e) {
      handleMysqlError(e, 'updateInvoiceStatus on table invoice');
    }
  }

  const db = readLocalDb();
  const inv = db.invoices?.find((i) => i.id === id);
  if (inv) {
    inv.status = status;
    inv.paid_at = paidAt;
    inv.updated_at = now;
    writeLocalDb(db);
    return inv;
  }
  return null;
}

export async function deleteInvoice(id: number): Promise<boolean> {
  if (mysqlPool && mysqlConnected) {
    try {
      await mysqlPool.query('DELETE FROM invoice WHERE id_invoice = ?', [id]);
      return true;
    } catch (e) {
      handleMysqlError(e, 'deleteInvoice on table invoice');
    }
  }

  const db = readLocalDb();
  const initialLen = db.invoices?.length || 0;
  db.invoices = (db.invoices || []).filter((i) => i.id !== id);
  if (db.invoices.length !== initialLen) {
    writeLocalDb(db);
    return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// Disbursements (Pencairan Komisi / Dana Anggota) Repository
// -----------------------------------------------------------------------------

export async function getAllDisbursements(filter?: {
  status?: string;
  reference_number?: string;
  member_id?: number;
}): Promise<Disbursement[]> {
  if (mysqlPool && mysqlConnected) {
    try {
      let query = 'SELECT * FROM disbursements';
      const conditions: string[] = [];
      const params: any[] = [];

      if (filter?.status) {
        conditions.push('status = ?');
        params.push(filter.status);
      }
      if (filter?.reference_number) {
        conditions.push('reference_number = ?');
        params.push(filter.reference_number.trim());
      }
      if (filter?.member_id) {
        conditions.push('member_id = ?');
        params.push(filter.member_id);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY id DESC';

      const [rows]: any = await mysqlPool.query(query, params);
      return rows.map((r: any) => ({
        ...r,
        id: Number(r.id),
        member_id: Number(r.member_id),
        amount: Number(r.amount),
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        processed_at: r.processed_at ? new Date(r.processed_at).toISOString() : null,
      }));
    } catch (e) {
      handleMysqlError(e, 'getAllDisbursements');
    }
  }

  const db = readLocalDb();
  let list = db.disbursements || [];
  if (filter?.status) {
    list = list.filter((d) => d.status === filter.status);
  }
  if (filter?.reference_number) {
    const term = filter.reference_number.trim().toLowerCase();
    list = list.filter((d) => d.reference_number.toLowerCase() === term);
  }
  if (filter?.member_id) {
    list = list.filter((d) => d.member_id === filter.member_id);
  }
  return [...list].sort((a, b) => b.id - a.id);
}

export async function getDisbursementById(id: number): Promise<Disbursement | null> {
  if (mysqlPool && mysqlConnected) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM disbursements WHERE id = ? LIMIT 1', [id]);
      if (rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          id: Number(r.id),
          member_id: Number(r.member_id),
          amount: Number(r.amount),
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
          processed_at: r.processed_at ? new Date(r.processed_at).toISOString() : null,
        };
      }
      return null;
    } catch (e) {
      handleMysqlError(e, 'getDisbursementById');
    }
  }

  const db = readLocalDb();
  return db.disbursements?.find((d) => d.id === id) || null;
}

export async function createDisbursementRequest(params: {
  member_id: number;
  reference_number: string;
  member_name: string;
  member_phone: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  notes?: string;
}): Promise<{ success: boolean; disbursement?: Disbursement; error?: string }> {
  const settings = await getSettings();
  const minAmount = Number(settings.min_disbursement_amount) || 25000;
  const amount = Number(params.amount);

  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Nominal pencairan harus lebih dari Rp 0.' };
  }

  if (amount < minAmount) {
    return {
      success: false,
      error: `Minimal nominal pencairan komisi adalah Rp ${minAmount.toLocaleString('id-ID')}.`,
    };
  }

  // Validasi saldo komisi saat ini
  const summary = await getMemberCommissionSummary(params.reference_number);
  if (amount > summary.availableBalance) {
    return {
      success: false,
      error: `Saldo komisi siap cair Anda tidak mencukupi (Tersedia: Rp ${summary.availableBalance.toLocaleString('id-ID')}).`,
    };
  }

  const now = new Date().toISOString();
  const dateStr = now.slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const disbursementCode = `WD-${dateStr}-${randomSuffix}`;

  if (mysqlPool && mysqlConnected) {
    try {
      const [res]: any = await mysqlPool.query(
        `INSERT INTO disbursements (
          disbursement_code, member_id, reference_number, member_name, member_phone,
          amount, bank_name, account_number, account_holder, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          disbursementCode,
          params.member_id,
          params.reference_number.trim(),
          params.member_name.trim(),
          params.member_phone.trim(),
          amount,
          params.bank_name.trim(),
          params.account_number.trim(),
          params.account_holder.trim(),
          params.notes?.trim() || null,
        ]
      );

      const created: Disbursement = {
        id: res.insertId,
        disbursement_code: disbursementCode,
        member_id: params.member_id,
        reference_number: params.reference_number.trim(),
        member_name: params.member_name.trim(),
        member_phone: params.member_phone.trim(),
        amount: amount,
        bank_name: params.bank_name.trim(),
        account_number: params.account_number.trim(),
        account_holder: params.account_holder.trim(),
        notes: params.notes?.trim() || null,
        status: 'pending',
        created_at: now,
      };

      return { success: true, disbursement: created };
    } catch (e: any) {
      handleMysqlError(e, 'createDisbursementRequest');
    }
  }

  // Local storage fallback
  const db = readLocalDb();
  if (!db.disbursements) db.disbursements = [];

  const newDisb: Disbursement = {
    id: db.disbursements.length > 0 ? Math.max(...db.disbursements.map((d) => d.id)) + 1 : 1,
    disbursement_code: disbursementCode,
    member_id: params.member_id,
    reference_number: params.reference_number.trim(),
    member_name: params.member_name.trim(),
    member_phone: params.member_phone.trim(),
    amount: amount,
    bank_name: params.bank_name.trim(),
    account_number: params.account_number.trim(),
    account_holder: params.account_holder.trim(),
    notes: params.notes?.trim() || null,
    status: 'pending',
    created_at: now,
  };

  db.disbursements.push(newDisb);
  writeLocalDb(db);
  return { success: true, disbursement: newDisb };
}

export async function approveDisbursement(
  id: number,
  params: {
    processed_by?: string;
    transfer_proof_ref?: string;
    admin_notes?: string;
  }
): Promise<{ success: boolean; disbursement?: Disbursement; error?: string }> {
  const existing = await getDisbursementById(id);
  if (!existing) {
    return { success: false, error: 'Data pengajuan pencairan tidak ditemukan.' };
  }

  if (existing.status !== 'pending') {
    return {
      success: false,
      error: `Pengajuan ini sudah berstatus ${existing.status} sebelumnya dan tidak dapat disetujui ulang.`,
    };
  }

  const now = new Date().toISOString();
  const processedBy = params.processed_by?.trim() || 'Admin';
  const proofRef = params.transfer_proof_ref?.trim() || null;
  const adminNotes = params.admin_notes?.trim() || 'Pencairan telah disetujui dan ditransfer.';

  if (mysqlPool && mysqlConnected) {
    try {
      await mysqlPool.query(
        `UPDATE disbursements 
         SET status = 'approved',
             transfer_proof_ref = ?,
             admin_notes = ?,
             processed_by = ?,
             processed_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [proofRef, adminNotes, processedBy, id]
      );

      const updated = await getDisbursementById(id);
      return { success: true, disbursement: updated || undefined };
    } catch (e: any) {
      handleMysqlError(e, 'approveDisbursement');
    }
  }

  const db = readLocalDb();
  const disb = db.disbursements?.find((d) => d.id === id);
  if (disb) {
    disb.status = 'approved';
    disb.transfer_proof_ref = proofRef;
    disb.admin_notes = adminNotes;
    disb.processed_by = processedBy;
    disb.processed_at = now;
    disb.updated_at = now;
    writeLocalDb(db);
    return { success: true, disbursement: disb };
  }

  return { success: false, error: 'Gagal memperbarui status pencairan.' };
}

export async function rejectDisbursement(
  id: number,
  params: {
    processed_by?: string;
    admin_notes?: string;
  }
): Promise<{ success: boolean; disbursement?: Disbursement; error?: string }> {
  const existing = await getDisbursementById(id);
  if (!existing) {
    return { success: false, error: 'Data pengajuan pencairan tidak ditemukan.' };
  }

  if (existing.status !== 'pending') {
    return {
      success: false,
      error: `Pengajuan ini sudah berstatus ${existing.status} sebelumnya dan tidak dapat ditolak.`,
    };
  }

  const now = new Date().toISOString();
  const processedBy = params.processed_by?.trim() || 'Admin';
  const adminNotes = params.admin_notes?.trim() || 'Pengajuan pencairan belum dapat disetujui.';

  if (mysqlPool && mysqlConnected) {
    try {
      await mysqlPool.query(
        `UPDATE disbursements 
         SET status = 'rejected',
             admin_notes = ?,
             processed_by = ?,
             processed_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [adminNotes, processedBy, id]
      );

      const updated = await getDisbursementById(id);
      return { success: true, disbursement: updated || undefined };
    } catch (e: any) {
      handleMysqlError(e, 'rejectDisbursement');
    }
  }

  const db = readLocalDb();
  const disb = db.disbursements?.find((d) => d.id === id);
  if (disb) {
    disb.status = 'rejected';
    disb.admin_notes = adminNotes;
    disb.processed_by = processedBy;
    disb.processed_at = now;
    disb.updated_at = now;
    writeLocalDb(db);
    return { success: true, disbursement: disb };
  }

  return { success: false, error: 'Gagal menolak status pencairan.' };
}



