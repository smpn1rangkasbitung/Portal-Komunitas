export interface Member {
  id: number;
  reference_number: string;
  full_name: string;
  phone_number: string;
  email?: string | null;
  city?: string | null;
  bio_interest?: string | null;
  invitation_id: number;
  status: 'active' | 'inactive' | 'suspended';
  password_hash?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Invitation {
  id: number;
  token: string;
  recipient_name: string;
  recipient_phone: string;
  status: 'pending' | 'used' | 'expired' | 'revoked';
  created_by: string;
  expires_at?: string | null;
  used_at?: string | null;
  created_at: string;
  member_reference?: string | null;
}

export interface NotificationLog {
  id: number;
  type: 'invite_link' | 'registration_success' | 'admin_alert' | 'manual_test' | 'disbursement_request' | 'disbursement_approved' | 'disbursement_rejected';
  recipient_phone: string;
  message_body: string;
  gateway_url: string;
  http_status: number | null;
  status: 'success' | 'failed' | 'pending';
  response_payload?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  nomor_referensi: string; // Kolom resmi dari tabel 'invoice' di database
  reference_number: string; // Alias kompatibilitas
  member_name?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  description?: string | null;
  total_amount: number;
  commission_rate_percent?: number | null;
  commission_amount: number;
  status: 'lunas' | 'pending' | 'batal';
  paid_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface MemberCommissionSummary {
  reference_number: string;
  member_name: string;
  totalEarnedCommission: number; // Hanya dari status order 'lunas'
  pendingCommission: number; // Komisi dari status order 'pending' (belum lunas)
  paidInvoicesCount: number; // Jumlah order lunas
  pendingInvoicesCount: number; // Jumlah order pending
  totalReferralSales: number; // Total nilai transaksi order lunas
  disbursedAmount: number; // Total komisi yang telah disetujui & dicairkan
  pendingDisbursementAmount: number; // Total komisi yang sedang diajukan dan menunggu approval
  availableBalance: number; // Saldo komisi siap dicairkan = totalEarnedCommission - (disbursedAmount + pendingDisbursementAmount)
  invoices: Invoice[];
  disbursements?: Disbursement[];
}

export interface Disbursement {
  id: number;
  disbursement_code: string;
  member_id: number;
  reference_number: string;
  member_name: string;
  member_phone: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  transfer_proof_ref?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AppSettings {
  wa_gateway_url: string;
  wa_api_key: string;
  wa_device_id: string;
  community_name: string;
  community_tagline: string;
  default_invite_message: string;
  default_success_message: string;
  // Pengaturan Komisi Anggota & Pencairan
  commission_rate_percent: number;
  commission_calculation_mode: 'percentage' | 'fixed';
  commission_fixed_amount: number;
  commission_description: string;
  min_disbursement_amount?: number;
}

export interface DatabaseStatus {
  isConnected: boolean;
  connectionType: 'mysql' | 'local_fallback';
  message: string;
  host: string;
  port: number;
  database: string;
  user: string;
  tablesVerified: boolean;
  tables: string[];
}

export interface DashboardStats {
  totalMembers: number;
  activeInvitations: number;
  usedInvitations: number;
  totalInvitations: number;
  totalNotifications: number;
  successfulNotifications: number;
  failedNotifications: number;
  totalInvoices?: number;
  totalPaidInvoices?: number;
  totalCommissionPaid?: number;
  totalDisbursements?: number;
  pendingDisbursements?: number;
  totalDisbursedAmount?: number;
  recentMembers: Member[];
  recentLogs: NotificationLog[];
  recentInvoices?: Invoice[];
  recentDisbursements?: Disbursement[];
}

export interface AuthSession {
  role: 'admin' | 'member';
  name: string;
  token: string;
  adminUsername?: string;
  member?: Member;
}

