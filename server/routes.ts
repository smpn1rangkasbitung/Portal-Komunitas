import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getDatabaseStatus,
  testMysqlDirect,
  runMysqlMigrations,
  getSettings,
  saveSettings,
  getAllInvitations,
  getInvitationByToken,
  createInvitation,
  revokeInvitation,
  regenerateInvitationToken,
  getAllMembers,
  registerNewMember,
  getNotificationLogs,
  getDashboardStats,
  validateAdminCredentials,
  findMemberForLogin,
  updateMemberProfile,
  authenticateMember,
  authenticateMemberByToken,
  updateMemberPassword,
  getAllInvoices,
  getInvoicesByReference,
  getMemberCommissionSummary,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getAllDisbursements,
  getDisbursementById,
  createDisbursementRequest,
  approveDisbursement,
  rejectDisbursement,
} from './db.ts';
import { sendWhatsAppNotification, normalizePhoneNumber } from './whatsapp.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMA_FILE_PATH = path.resolve(__dirname, '../schema.sql');

export const apiRouter = Router();

// -----------------------------------------------------------------------------
// Database Endpoints
// -----------------------------------------------------------------------------

apiRouter.get('/database/status', async (req, res) => {
  const status = getDatabaseStatus();
  res.json(status);
});

apiRouter.get('/db-status', async (req, res) => {
  const status = getDatabaseStatus();
  res.json(status);
});

apiRouter.post('/database/test-mysql', async (req, res) => {
  const result = await testMysqlDirect();
  res.json(result);
});

apiRouter.post('/database/migrate', async (req, res) => {
  const result = await runMysqlMigrations();
  res.json(result);
});

apiRouter.get('/database/schema-sql', (req, res) => {
  try {
    if (fs.existsSync(SCHEMA_FILE_PATH)) {
      const content = fs.readFileSync(SCHEMA_FILE_PATH, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(content);
    } else {
      res.status(404).json({ error: 'schema.sql tidak ditemukan' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Dashboard & Stats
// -----------------------------------------------------------------------------

apiRouter.get('/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Invitations (1 Link 1 Undangan)
// -----------------------------------------------------------------------------

apiRouter.get('/invitations', async (req, res) => {
  try {
    const list = await getAllInvitations();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/invitations', async (req, res) => {
  try {
    const { recipient_name, recipient_phone, expires_in_days, send_whatsapp } = req.body;
    if (!recipient_name || !recipient_phone) {
      return res.status(400).json({ error: 'Nama penerima dan nomor WhatsApp wajib diisi' });
    }

    // Generate unique single-use token (UUID format + high entropy hash)
    const rawToken = 'inv_' + crypto.randomBytes(16).toString('hex');

    const invitation = await createInvitation({
      token: rawToken,
      recipient_name: recipient_name.trim(),
      recipient_phone: recipient_phone.trim(),
      created_by: 'Admin',
      expires_in_days: expires_in_days ? parseInt(expires_in_days, 10) : 7,
    });

    let waResult = null;
    const appOrigin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const inviteLink = `${appOrigin}/join?token=${invitation.token}`;

    if (send_whatsapp) {
      const settings = await getSettings();
      let msgText = settings.default_invite_message || 'Halo {name}! Anda mendapatkan undangan pendaftaran di {community}. Kunjungi: {link}';
      msgText = msgText
        .replace(/{name}/g, invitation.recipient_name)
        .replace(/{community}/g, settings.community_name || 'Komunitas Kami')
        .replace(/{link}/g, inviteLink);

      waResult = await sendWhatsAppNotification({
        type: 'invite_link',
        receiverPhone: invitation.recipient_phone,
        message: msgText,
        variables: {
          name: invitation.recipient_name,
          community: settings.community_name || 'Komunitas',
          link: inviteLink,
        },
      });
    }

    res.json({
      success: true,
      invitation,
      invite_link: inviteLink,
      whatsapp: waResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/invitations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await revokeInvitation(id);
    if (!success) {
      return res.status(400).json({ error: 'Undangan tidak dapat dibatalkan atau sudah digunakan.' });
    }
    res.json({ success: true, message: 'Undangan berhasil dibatalkan.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Regenerate single-use token for an existing invitation
apiRouter.post('/invitations/:id/regenerate-token', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { expires_in_days } = req.body;
    const result = await regenerateInvitationToken(id, expires_in_days ? parseInt(expires_in_days, 10) : 7);

    if (!result.success || !result.invitation) {
      return res.status(400).json({ error: result.error || 'Gagal generate ulang token.' });
    }

    const appOrigin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const inviteLink = `${appOrigin}/join?token=${result.invitation.token}`;

    res.json({
      success: true,
      invitation: result.invitation,
      invite_link: inviteLink,
      message: `Token pendaftaran untuk ${result.invitation.recipient_name} berhasil di-generate ulang!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Quick generate invitation link with token
apiRouter.post('/invitations/quick-generate', async (req, res) => {
  try {
    const { recipient_name, recipient_phone, expires_in_days } = req.body;
    const rawToken = 'inv_' + crypto.randomBytes(16).toString('hex');
    const name = (recipient_name && recipient_name.trim()) || 'Calon Anggota';
    const phone = (recipient_phone && recipient_phone.trim()) || '-';

    const invitation = await createInvitation({
      token: rawToken,
      recipient_name: name,
      recipient_phone: phone,
      created_by: 'Admin (Instan)',
      expires_in_days: expires_in_days ? parseInt(expires_in_days, 10) : 7,
    });

    const appOrigin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const inviteLink = `${appOrigin}/join?token=${invitation.token}`;

    res.json({
      success: true,
      invitation,
      invite_link: inviteLink,
      message: 'Link pendaftaran dengan token baru berhasil dibuat.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Validate token before displaying register form
apiRouter.get('/invitations/validate/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({
        valid: false,
        reason: 'NOT_FOUND',
        message: 'Tautan undangan ini tidak sah atau tidak ditemukan dalam sistem.',
      });
    }

    if (invitation.status === 'used') {
      return res.status(410).json({
        valid: false,
        reason: 'ALREADY_USED',
        message: 'Tautan undangan ini telah digunakan sebelumnya. Setiap tautan hanya berlaku untuk 1 kali pendaftaran.',
        used_at: invitation.used_at,
        member_reference: invitation.member_reference,
      });
    }

    if (invitation.status === 'revoked') {
      return res.status(403).json({
        valid: false,
        reason: 'REVOKED',
        message: 'Undangan ini telah dibatalkan atau dinonaktifkan oleh administrator.',
      });
    }

    if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
      return res.status(410).json({
        valid: false,
        reason: 'EXPIRED',
        message: 'Tautan undangan ini telah kedaluwarsa.',
      });
    }

    const settings = await getSettings();

    res.json({
      valid: true,
      invitation: {
        token: invitation.token,
        recipient_name: invitation.recipient_name,
        recipient_phone: invitation.recipient_phone,
        expires_at: invitation.expires_at,
      },
      community: {
        name: settings.community_name,
        tagline: settings.community_tagline,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Member Registration & Unique Reference Dispatch
// -----------------------------------------------------------------------------

apiRouter.post('/register', async (req, res) => {
  try {
    const { token, full_name, phone_number, password, email, city, bio_interest } = req.body;

    if (!token || !full_name || !phone_number || !password) {
      return res.status(400).json({ error: 'Token, Nama Lengkap, Nomor WhatsApp, dan Kata Sandi wajib diisi.' });
    }

    if (password.trim().length < 5) {
      return res.status(400).json({ error: 'Kata sandi akun minimal 5 karakter.' });
    }

    const regResult = await registerNewMember({
      token: token.trim(),
      full_name: full_name.trim(),
      phone_number: phone_number.trim(),
      password: password.trim(),
      email: email?.trim(),
      city: city?.trim(),
      bio_interest: bio_interest?.trim(),
    });

    if (!regResult.success || !regResult.member) {
      return res.status(400).json({ error: regResult.error || 'Pendaftaran gagal.' });
    }

    // Trigger Automated WhatsApp Notification to the new member with unique reference number
    const settings = await getSettings();
    let successMsg = settings.default_success_message || 'Selamat {name}! Pendaftaran berhasil. Nomor Referensi Anda: {reference_number}';
    successMsg = successMsg
      .replace(/{name}/g, regResult.member.full_name)
      .replace(/{community}/g, settings.community_name || 'Komunitas')
      .replace(/{reference_number}/g, regResult.member.reference_number);

    // Send in background or await
    const waResult = await sendWhatsAppNotification({
      type: 'registration_success',
      receiverPhone: regResult.member.phone_number,
      message: successMsg,
      variables: {
        name: regResult.member.full_name,
        community: settings.community_name || 'Komunitas',
        reference_number: regResult.member.reference_number,
      },
    });

    res.json({
      success: true,
      member: regResult.member,
      reference_number: regResult.member.reference_number,
      whatsapp: waResult,
      community: {
        name: settings.community_name,
        tagline: settings.community_tagline,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Members Management
// -----------------------------------------------------------------------------

apiRouter.get('/members', async (req, res) => {
  try {
    const members = await getAllMembers();
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// WhatsApp Gateway & Logs
// -----------------------------------------------------------------------------

apiRouter.get('/whatsapp/logs', async (req, res) => {
  try {
    const logs = await getNotificationLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/whatsapp/send-test', async (req, res) => {
  try {
    const { receiver_phone, message, simulate } = req.body;
    if (!receiver_phone || !message) {
      return res.status(400).json({ error: 'Nomor WhatsApp dan pesan wajib diisi' });
    }

    const result = await sendWhatsAppNotification({
      type: 'manual_test',
      receiverPhone: receiver_phone,
      message: message,
      simulateOnly: Boolean(simulate),
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// App Settings
// -----------------------------------------------------------------------------

apiRouter.get('/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/settings', async (req, res) => {
  try {
    const updated = await saveSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Invoices & Member Commissions Endpoints
// ATURAN SISTEM: Komisi hanya aktif dan dihitung jika status invoice 'lunas'
// -----------------------------------------------------------------------------

apiRouter.get('/invoices', async (req, res) => {
  try {
    const { reference_number, nomor_referensi, status } = req.query;
    const filter: any = {};
    if (typeof reference_number === 'string') filter.reference_number = reference_number;
    if (typeof nomor_referensi === 'string') filter.nomor_referensi = nomor_referensi;
    if (typeof status === 'string') filter.status = status;

    const list = await getAllInvoices(filter);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/invoices', async (req, res) => {
  try {
    const {
      invoice_number,
      reference_number,
      nomor_referensi,
      customer_name,
      customer_phone,
      description,
      total_amount,
      commission_rate_percent,
      commission_amount,
      status,
    } = req.body;

    const refNum = (nomor_referensi || reference_number || '').trim();
    if (!refNum || !customer_name || total_amount === undefined) {
      return res.status(400).json({ error: 'Nomor referensi anggota (nomor_referensi), nama pelanggan, dan total transaksi wajib diisi.' });
    }

    const created = await createInvoice({
      invoice_number,
      reference_number: refNum,
      nomor_referensi: refNum,
      customer_name: customer_name.trim(),
      customer_phone,
      description,
      total_amount: Number(total_amount),
      commission_rate_percent: commission_rate_percent !== undefined ? Number(commission_rate_percent) : undefined,
      commission_amount: commission_amount !== undefined ? Number(commission_amount) : undefined,
      status: status || 'pending',
    });

    res.json({ success: true, invoice: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/invoices/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!['lunas', 'pending', 'batal'].includes(status)) {
      return res.status(400).json({ error: 'Status harus lunas, pending, atau batal.' });
    }

    const updated = await updateInvoiceStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Invoice tidak ditemukan.' });
    }

    res.json({ success: true, invoice: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/invoices/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await deleteInvoice(id);
    if (!success) {
      return res.status(404).json({ error: 'Invoice tidak ditemukan atau gagal dihapus.' });
    }
    res.json({ success: true, message: 'Invoice berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Member Commission Summary endpoint
apiRouter.get('/members/me/commission', async (req, res) => {
  try {
    const ref = (req.query.nomor_referensi || req.query.reference_number);
    if (!ref || typeof ref !== 'string') {
      return res.status(400).json({ error: 'Nomor referensi anggota (nomor_referensi) wajib disertakan.' });
    }

    const summary = await getMemberCommissionSummary(ref.trim());
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Disbursements (Pencairan Komisi / Dana Anggota & Approval) Endpoints
// -----------------------------------------------------------------------------

// List all disbursement requests (supports filtering by status, reference_number, member_id)
apiRouter.get('/disbursements', async (req, res) => {
  try {
    const { status, reference_number, member_id } = req.query;
    const filter: any = {};
    if (typeof status === 'string' && status !== 'all') filter.status = status;
    if (typeof reference_number === 'string') filter.reference_number = reference_number;
    if (typeof member_id === 'string') filter.member_id = parseInt(member_id, 10);

    const list = await getAllDisbursements(filter);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get disbursement detail by ID
apiRouter.get('/disbursements/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await getDisbursementById(id);
    if (!item) {
      return res.status(404).json({ error: 'Data pencairan tidak ditemukan.' });
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Member requests a disbursement (Request Pencairan)
apiRouter.post('/disbursements/request', async (req, res) => {
  try {
    const {
      member_id,
      reference_number,
      amount,
      bank_name,
      account_number,
      account_holder,
      notes,
      send_whatsapp,
    } = req.body;

    if (!member_id || !reference_number) {
      return res.status(400).json({ error: 'Informasi anggota (ID & Nomor Referensi) tidak lengkap.' });
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Nominal pencairan wajib diisi dan harus lebih dari 0.' });
    }

    if (!bank_name || !account_number || !account_holder) {
      return res.status(400).json({
        error: 'Nama Bank / E-Wallet, Nomor Rekening, dan Nama Pemilik Rekening wajib diisi lengkap.',
      });
    }

    // Lookup member data to ensure authenticity
    const members = await getAllMembers();
    const member = members.find(
      (m) => m.id === Number(member_id) || m.reference_number === String(reference_number).trim()
    );

    if (!member) {
      return res.status(404).json({ error: 'Data anggota tidak ditemukan dalam sistem.' });
    }

    const result = await createDisbursementRequest({
      member_id: member.id,
      reference_number: member.reference_number,
      member_name: member.full_name,
      member_phone: member.phone_number,
      amount: Number(amount),
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      account_holder: account_holder.trim(),
      notes: notes?.trim(),
    });

    if (!result.success || !result.disbursement) {
      return res.status(400).json({ error: result.error || 'Gagal mengajukan pencairan dana.' });
    }

    // Optional WhatsApp alert to member confirming request submitted
    let waResult = null;
    if (send_whatsapp) {
      const settings = await getSettings();
      const msg =
        `Halo ${member.full_name}! Permintaan pencairan komisi Anda telah berhasil diajukan:\n\n` +
        `• Kode Pengajuan: *${result.disbursement.disbursement_code}*\n` +
        `• Nominal: *Rp ${Number(result.disbursement.amount).toLocaleString('id-ID')}*\n` +
        `• Rekening Tujuan: *${result.disbursement.bank_name} - ${result.disbursement.account_number} (a.n. ${result.disbursement.account_holder})*\n` +
        `• Status: *Menunggu Persetujuan & Verifikasi Admin*\n\n` +
        `Kami akan memberitahukan Anda kembali segera setelah dana berhasil ditransfer. Terima kasih!`;

      waResult = await sendWhatsAppNotification({
        type: 'disbursement_request',
        receiverPhone: member.phone_number,
        message: msg,
        variables: {
          name: member.full_name,
          code: result.disbursement.disbursement_code,
          amount: String(result.disbursement.amount),
        },
      });
    }

    res.json({
      success: true,
      disbursement: result.disbursement,
      whatsapp: waResult,
      message: 'Permintaan pencairan komisi berhasil diajukan dan sedang menunggu verifikasi admin.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin approves a disbursement (Approval Pencairan)
apiRouter.patch('/disbursements/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { processed_by, transfer_proof_ref, admin_notes, send_whatsapp } = req.body;

    const result = await approveDisbursement(id, {
      processed_by: processed_by || 'Admin',
      transfer_proof_ref,
      admin_notes,
    });

    if (!result.success || !result.disbursement) {
      return res.status(400).json({ error: result.error || 'Gagal menyetujui pengajuan pencairan.' });
    }

    // Trigger Automated WhatsApp Notification to Member
    let waResult = null;
    if (send_whatsapp !== false && result.disbursement.member_phone) {
      const settings = await getSettings();
      const amountFmt = Number(result.disbursement.amount).toLocaleString('id-ID');
      const msg =
        `Halo ${result.disbursement.member_name}! 🎉\n\n` +
        `Kabar gembira! Permintaan pencairan komisi Anda sebesar *Rp ${amountFmt}* telah *DISETUJUI & DITRANSFER* oleh Administrator ${settings.community_name || 'Komunitas'}.\n\n` +
        `• Kode Pencairan: *${result.disbursement.disbursement_code}*\n` +
        `• Rekening Tujuan: *${result.disbursement.bank_name} - ${result.disbursement.account_number} (a.n. ${result.disbursement.account_holder})*\n` +
        (result.disbursement.transfer_proof_ref ? `• Bukti Transfer/Ref: *${result.disbursement.transfer_proof_ref}*\n` : '') +
        (result.disbursement.admin_notes ? `• Catatan Admin: _${result.disbursement.admin_notes}_\n` : '') +
        `\nSilakan periksa mutasi rekening Anda. Terima kasih atas kontribusi aktif Anda di komunitas kami!`;

      waResult = await sendWhatsAppNotification({
        type: 'disbursement_approved',
        receiverPhone: result.disbursement.member_phone,
        message: msg,
        variables: {
          name: result.disbursement.member_name,
          amount: amountFmt,
          code: result.disbursement.disbursement_code,
          proof: result.disbursement.transfer_proof_ref || '',
        },
      });
    }

    res.json({
      success: true,
      disbursement: result.disbursement,
      whatsapp: waResult,
      message: 'Pencairan komisi berhasil disetujui dan ditandai cair.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin rejects a disbursement (Tolak Pencairan)
apiRouter.patch('/disbursements/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { processed_by, admin_notes, send_whatsapp } = req.body;

    if (!admin_notes || !admin_notes.trim()) {
      return res.status(400).json({ error: 'Alasan penolakan pencairan wajib diisi.' });
    }

    const result = await rejectDisbursement(id, {
      processed_by: processed_by || 'Admin',
      admin_notes: admin_notes.trim(),
    });

    if (!result.success || !result.disbursement) {
      return res.status(400).json({ error: result.error || 'Gagal memproses penolakan pencairan.' });
    }

    // Trigger WhatsApp notification explaining rejection
    let waResult = null;
    if (send_whatsapp !== false && result.disbursement.member_phone) {
      const settings = await getSettings();
      const amountFmt = Number(result.disbursement.amount).toLocaleString('id-ID');
      const msg =
        `Halo ${result.disbursement.member_name}.\n\n` +
        `Mohon maaf, permintaan pencairan komisi Anda sebesar *Rp ${amountFmt}* (Kode: *${result.disbursement.disbursement_code}*) belum dapat disetujui oleh Administrator.\n\n` +
        `• Alasan Penolakan: *${result.disbursement.admin_notes}*\n\n` +
        `Saldo komisi Anda telah dikembalikan secara utuh ke akun keanggotaan Anda. Anda dapat mengajukan kembali dengan data rekening yang sesuai di portal anggota. Terima kasih.`;

      waResult = await sendWhatsAppNotification({
        type: 'disbursement_rejected',
        receiverPhone: result.disbursement.member_phone,
        message: msg,
        variables: {
          name: result.disbursement.member_name,
          amount: amountFmt,
          code: result.disbursement.disbursement_code,
          reason: result.disbursement.admin_notes || '',
        },
      });
    }

    res.json({
      success: true,
      disbursement: result.disbursement,
      whatsapp: waResult,
      message: 'Pengajuan pencairan telah ditolak dan saldo dikembalikan ke anggota.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Authentication Endpoints (Admin & Member)
// -----------------------------------------------------------------------------

apiRouter.post('/auth/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const isValid = await validateAdminCredentials(username, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Kredensial admin salah. Silakan periksa kembali username dan password.' });
    }

    const token = 'adm_' + crypto.randomBytes(24).toString('hex');
    res.json({
      success: true,
      role: 'admin',
      name: 'Administrator Komunitas',
      adminUsername: username,
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/member-login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Nomor Referensi Unik atau Nomor WhatsApp wajib diisi.' });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Kata sandi (password) wajib diisi untuk login akun anggota.' });
    }

    const authRes = await authenticateMember(identifier.trim(), password.trim());
    if (!authRes.success || !authRes.member) {
      return res.status(401).json({
        error: authRes.error || 'Autentikasi gagal. Periksa kembali Nomor Referensi dan Kata Sandi Anda.',
      });
    }

    const token = 'mem_' + crypto.randomBytes(24).toString('hex');
    res.json({
      success: true,
      role: 'member',
      name: authRes.member.full_name,
      member: authRes.member,
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Member login without password using token (1 Link 1 Registrasi Token / Access Token)
apiRouter.post('/auth/member-login-by-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || !token.trim()) {
      return res.status(400).json({ error: 'Kode token pendaftaran/akses wajib diisi.' });
    }

    const authRes = await authenticateMemberByToken(token.trim());
    if (!authRes.success || !authRes.member) {
      return res.status(401).json({
        error: authRes.error || 'Token tidak valid atau tidak terhubung ke akun anggota.',
      });
    }

    const sessionToken = 'mem_' + crypto.randomBytes(24).toString('hex');
    res.json({
      success: true,
      role: 'member',
      name: authRes.member.full_name,
      member: authRes.member,
      token: sessionToken,
      message: 'Login tanpa password menggunakan token berhasil diverifikasi.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Berhasil keluar (logout) dari sesi.' });
});

apiRouter.post('/members/me/change-password', async (req, res) => {
  try {
    const { member_id, new_password } = req.body;
    if (!member_id || !new_password || new_password.trim().length < 5) {
      return res.status(400).json({ error: 'Kata sandi baru minimal 5 karakter.' });
    }

    const success = await updateMemberPassword(member_id, new_password.trim());
    if (success) {
      res.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
    } else {
      res.status(400).json({ error: 'Gagal memperbarui kata sandi.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/members/me/update', async (req, res) => {
  try {
    const { member_id, email, city, bio_interest, bank_name, account_number, account_holder } = req.body;
    if (!member_id) {
      return res.status(400).json({ error: 'ID anggota tidak valid.' });
    }

    const updated = await updateMemberProfile(member_id, {
      email: email !== undefined ? email.trim() : undefined,
      city: city !== undefined ? city.trim() : undefined,
      bio_interest: bio_interest !== undefined ? bio_interest.trim() : undefined,
      bank_name: bank_name !== undefined ? bank_name.trim() : undefined,
      account_number: account_number !== undefined ? account_number.trim() : undefined,
      account_holder: account_holder !== undefined ? account_holder.trim() : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Gagal memperbarui profil anggota.' });
    }

    res.json({ success: true, member: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/members/me/resend-card-wa', async (req, res) => {
  try {
    const { member_id } = req.body;
    const members = await getAllMembers();
    const member = members.find((m) => m.id === member_id);

    if (!member) {
      return res.status(404).json({ error: 'Anggota tidak ditemukan.' });
    }

    const settings = await getSettings();
    const msg = `Halo ${member.full_name}! Berikut adalah informasi kartu keanggotaan resmi Anda di ${settings.community_name || 'Komunitas'}:\n\n` +
      `Nomor Referensi Unik: *${member.reference_number}*\n` +
      `Status: Aktif Terverifikasi\n` +
      `Kota: ${member.city || 'Indonesia'}\n\n` +
      `Simpan nomor referensi ini sebagai bukti keanggotaan resmi Anda.`;

    const waRes = await sendWhatsAppNotification({
      type: 'registration_success',
      receiverPhone: member.phone_number,
      message: msg,
      variables: {
        name: member.full_name,
        reference_number: member.reference_number,
        community: settings.community_name,
      },
    });

    res.json({ success: true, whatsapp: waRes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

