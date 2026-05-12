import * as functions from 'firebase-functions';
import fetch from 'node-fetch';

export const sendTelegramAlert = functions.runWith({ secrets: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"] }).https.onCall(
  async (data, context) => {
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
    const { action, message, level } = data;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The function must be configured with TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID secrets."
      );
    }

    if (!message) {
      throw new functions.https.HttpsError("invalid-argument", "The function must be called with a message.");
    }

    let emoji = "ℹ️";
    if (level === "error" || level === "fatal") emoji = "🚨";
    else if (level === "warn") emoji = "⚠️";

    const text = `${emoji} [${action || "SYSTEM"}] ${message}`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
          }),
        }
      );

      if (!response.ok) {
        throw new functions.https.HttpsError("internal", `Telegram API error: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      throw new functions.https.HttpsError("internal", "Failed to send Telegram alert", error);
    }
  }
);
