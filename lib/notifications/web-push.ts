import webPush from 'web-push';

type PushMessage = {
  subscription: webPush.PushSubscription;
  title: string;
  body: string;
  notificationId: string;
  url?: string;
};

type PushResult = {
  success: boolean;
  errorCode: string | null;
};

function getVapidConfig() {
  // Trim is critical: when env vars are pasted/uploaded with trailing newlines
  // (a very common Vercel-CLI / dashboard mistake), web-push rejects the key
  // with "Vapid public key must be a URL-safe base64 encoded 65-byte value".
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

function configureWebPush() {
  const config = getVapidConfig();
  if (!config) return false;
  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return true;
}

export async function sendPushMessages(messages: PushMessage[]): Promise<PushResult[]> {
  if (messages.length === 0) return [];
  if (!configureWebPush()) {
    return messages.map(() => ({ success: false, errorCode: 'web_push_not_configured' }));
  }

  return Promise.all(messages.map(async (message) => {
    try {
      await webPush.sendNotification(message.subscription, JSON.stringify({
        title: message.title,
        body: message.body,
        notificationId: message.notificationId,
        url: message.url ?? '/notifications',
      }));

      return { success: true, errorCode: null };
    } catch (error) {
      const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
        ? String((error as { statusCode?: number }).statusCode)
        : null;
      return {
        success: false,
        errorCode: statusCode ? `web_push_${statusCode}` : 'web_push_failed',
      };
    }
  }));
}

export function shouldRevokePushSubscription(errorCode: string | null): boolean {
  return errorCode === 'web_push_404' || errorCode === 'web_push_410';
}
