import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

type PushMessage = {
  token: string;
  title: string;
  body: string;
  notificationId: string;
  url?: string;
};

type PushResult = {
  success: boolean;
  messageId: string | null;
  errorCode: string | null;
};

function getFirebaseAdminReady() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) return false;

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return true;
}

export async function sendPushMessages(messages: PushMessage[]): Promise<PushResult[]> {
  if (messages.length === 0) return [];
  if (!getFirebaseAdminReady()) {
    return messages.map(() => ({
      success: false,
      messageId: null,
      errorCode: 'fcm_not_configured',
    }));
  }

  const response = await getMessaging().sendEach(messages.map((message) => ({
    token: message.token,
    data: {
      title: message.title,
      body: message.body,
      notificationId: message.notificationId,
      url: message.url ?? '/notifications',
    },
    webpush: {
      fcmOptions: {
        link: message.url ?? '/notifications',
      },
    },
  })));

  return response.responses.map((result) => ({
    success: result.success,
    messageId: result.messageId ?? null,
    errorCode: result.error?.code ?? null,
  }));
}

export function shouldRevokePushToken(errorCode: string | null): boolean {
  return errorCode === 'messaging/registration-token-not-registered'
    || errorCode === 'messaging/invalid-registration-token'
    || errorCode === 'messaging/invalid-argument';
}
