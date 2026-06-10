import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Message } from 'firebase-admin/messaging';

type FcmMessage = {
  token: string;
  title: string;
  body: string;
  notificationId: string;
  url?: string;
};

export type FcmSendResult = {
  success: boolean;
  errorCode: string | null;
};

type ServiceAccountInput = {
  project_id?: unknown;
  projectId?: unknown;
  client_email?: unknown;
  clientEmail?: unknown;
  private_key?: unknown;
  privateKey?: unknown;
};

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, '\n');
}

function readServiceAccountFromJson(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  const json = raw.startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8');
  const parsed = JSON.parse(json) as ServiceAccountInput;
  const projectId = typeof parsed.project_id === 'string'
    ? parsed.project_id
    : typeof parsed.projectId === 'string'
      ? parsed.projectId
      : '';
  const clientEmail = typeof parsed.client_email === 'string'
    ? parsed.client_email
    : typeof parsed.clientEmail === 'string'
      ? parsed.clientEmail
      : '';
  const privateKey = typeof parsed.private_key === 'string'
    ? parsed.private_key
    : typeof parsed.privateKey === 'string'
      ? parsed.privateKey
      : '';

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey: normalizePrivateKey(privateKey) };
}

function readServiceAccountFromEnv(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey: normalizePrivateKey(privateKey) };
}

function getFirebaseApp(): { app: App; errorCode?: never } | { app?: never; errorCode: string } {
  const existing = getApps()[0];
  if (existing) return { app: existing };

  try {
    const serviceAccount = readServiceAccountFromJson() ?? readServiceAccountFromEnv();
    if (!serviceAccount) return { errorCode: 'fcm_not_configured' };

    return {
      app: initializeApp({
        credential: cert({
          projectId: serviceAccount.projectId,
          clientEmail: serviceAccount.clientEmail,
          privateKey: serviceAccount.privateKey,
        }),
        projectId: serviceAccount.projectId,
      }),
    };
  } catch (error) {
    return {
      errorCode: error instanceof Error
        ? `fcm_config_error:${error.message.slice(0, 120)}`
        : 'fcm_config_error',
    };
  }
}

function readFcmErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim()) return code;
  }
  if (error instanceof Error && error.message) {
    return `fcm_failed:${error.message.slice(0, 120)}`;
  }
  return 'fcm_failed';
}

export async function sendFcmMessages(messages: FcmMessage[]): Promise<FcmSendResult[]> {
  if (messages.length === 0) return [];

  const appResult = getFirebaseApp();
  if (appResult.errorCode) {
    return messages.map(() => ({ success: false, errorCode: appResult.errorCode }));
  }

  const messaging = getMessaging(appResult.app);

  return Promise.all(messages.map(async (message) => {
    const payload: Message = {
      token: message.token,
      notification: {
        title: message.title,
        body: message.body,
      },
      data: {
        notificationId: message.notificationId,
        url: message.url ?? '/notifications',
      },
      android: {
        priority: 'high',
        notification: {
          tag: message.notificationId,
        },
      },
    };

    try {
      await messaging.send(payload);
      return { success: true, errorCode: null };
    } catch (error) {
      return { success: false, errorCode: readFcmErrorCode(error) };
    }
  }));
}

export function shouldRevokeFcmToken(errorCode: string | null): boolean {
  return errorCode === 'messaging/registration-token-not-registered'
    || errorCode === 'messaging/invalid-registration-token';
}
