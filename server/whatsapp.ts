import { getSettings, logNotification } from './db.ts';

export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/\D/g, ''); // keep only digits
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export interface SendWhatsAppParams {
  type: 'invite_link' | 'registration_success' | 'admin_alert' | 'manual_test' | 'disbursement_request' | 'disbursement_approved' | 'disbursement_rejected';
  receiverPhone: string;
  message: string;
  variables?: Record<string, string>;
  simulateOnly?: boolean;
  mediaUrl?: string;
  delay?: number;
  simulateTyping?: boolean;
}

export const DEFAULT_WA_GATEWAY_URL = 'https://tiket.sayuti.com/api/gateway/send';
export const DEFAULT_WA_BEARER_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU4NTU5MzFmLTllMWQtNDRkZC05YWI3LTg4ZTA2NTI4YTkxNiIsImVtYWlsIjoiYWRtaW5Ac2F5dXRpLmNvbSIsInRlbmFudElkIjoiZjY0YjZjYTAtNzM1Yi00MjQ0LTllZTktMWVmOTI2N2Q0YTFhIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzkxODg3OTIwLCJleHAiOjE3OTI0OTI3MjB9.BMUGJlV8MiCl1e1L2ZT6lxWLG3H691x6OtrhRe3BZRU';

export async function sendWhatsAppNotification(params: SendWhatsAppParams): Promise<{
  success: boolean;
  httpStatus: number | null;
  messageId?: string;
  responsePayload?: any;
  error?: string;
}> {
  const settings = await getSettings();
  const normalizedPhone = normalizePhoneNumber(params.receiverPhone);
  const gatewayUrl = (settings.wa_gateway_url && settings.wa_gateway_url.trim()) || DEFAULT_WA_GATEWAY_URL;

  // Retrieve token: from settings or fallback to DEFAULT_WA_BEARER_TOKEN
  let authHeader = (settings.wa_api_key && settings.wa_api_key.trim()) || DEFAULT_WA_BEARER_TOKEN;
  if (!authHeader.startsWith('Bearer ') && !authHeader.startsWith('bearer ')) {
    authHeader = `Bearer ${authHeader}`;
  }

  // If simulation requested explicitly
  if (params.simulateOnly) {
    const responsePayload = {
      simulated: true,
      reason: 'Pengiriman diuji dalam mode simulasi oleh pengguna.',
      receiver: normalizedPhone,
      timestamp: new Date().toISOString(),
    };

    await logNotification({
      type: params.type,
      recipient_phone: normalizedPhone,
      message_body: params.message,
      gateway_url: gatewayUrl,
      http_status: 200,
      status: 'success',
      response_payload: JSON.stringify(responsePayload),
      error_message: null,
    });

    return {
      success: true,
      httpStatus: 200,
      responsePayload,
    };
  }

  // Live WhatsApp Gateway Request according to:
  // POST https://tiket.sayuti.com/api/gateway/send
  // Headers: { "Authorization": "Bearer ...", "Content-Type": "application/json" }
  // Body: { to, message, delay: 3, simulateTyping: true, mediaUrl?: ... }
  try {
    const payload: Record<string, any> = {
      to: normalizedPhone,
      message: params.message,
      delay: params.delay !== undefined ? params.delay : 3,
      simulateTyping: params.simulateTyping !== undefined ? params.simulateTyping : true,
    };

    if (params.mediaUrl) {
      payload.mediaUrl = params.mediaUrl;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      parsedJson = { raw: responseText };
    }

    const isSuccess = response.ok && (!parsedJson.status || parsedJson.status === 'success' || parsedJson.status === 'sent' || parsedJson.success === true || parsedJson.status === 200);

    await logNotification({
      type: params.type,
      recipient_phone: normalizedPhone,
      message_body: params.message,
      gateway_url: gatewayUrl,
      http_status: response.status,
      status: isSuccess ? 'success' : 'failed',
      response_payload: responseText,
      error_message: isSuccess ? null : (parsedJson.message || parsedJson.error || `HTTP ${response.status}: ${response.statusText}`),
    });

    return {
      success: isSuccess,
      httpStatus: response.status,
      responsePayload: parsedJson,
      error: isSuccess ? undefined : (parsedJson.message || parsedJson.error || `HTTP ${response.status}`),
    };
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError' ? 'Gateway timeout (15 detik)' : err.message;
    
    await logNotification({
      type: params.type,
      recipient_phone: normalizedPhone,
      message_body: params.message,
      gateway_url: gatewayUrl,
      http_status: 504,
      status: 'failed',
      error_message: errorMsg,
    });

    return {
      success: false,
      httpStatus: 504,
      error: errorMsg,
    };
  }
}
