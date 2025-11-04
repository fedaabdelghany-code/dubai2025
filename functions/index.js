import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import axios from "axios";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// OneSignal configuration
const ONESIGNAL_APP_ID = "e4848b1f-7e63-4dce-a616-0cdf07c79b4e";
const ONESIGNAL_REST_API_KEY = "os_v2_app_4sciwh36mng45jqwbtpqpr43jzrtplxe6xuujsfxlebnzhj2m4xucvlee6h5yy4e4sndvpv3mmzzmwlvlpi36csnotyzlfxkbpdyjhq";

// Helper to send a notification via OneSignal
async function sendOneSignalNotification(playerId, title, content, data = {}) {
  const notificationData = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: [playerId],
    headings: { en: title },
    contents: { en: content },
    data,
  };

  const response = await axios.post("https://onesignal.com/api/v1/notifications", notificationData, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
  });

  return response.data.id;
}

// 🔔 Send reminders every minute
export const sendSessionReminders = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "europe-west1",
  },
  async () => {
    try {
      const now = Timestamp.now();
      const fiveMinutesFromNow = Timestamp.fromMillis(now.toMillis() + 5 * 60 * 1000);
      const sixMinutesFromNow = Timestamp.fromMillis(now.toMillis() + 6 * 60 * 1000);

      console.log(`Checking agendas for sessions between ${fiveMinutesFromNow.toDate()} and ${sixMinutesFromNow.toDate()}`);

      const usersSnapshot = await db.collection("users").get();
      if (usersSnapshot.empty) {
        console.log("No users found.");
        return null;
      }

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        if (!user.oneSignalPlayerId) continue;

        const agendaRef = db.collection(`users/${userDoc.id}/agenda`);
        const agendaSnapshot = await agendaRef
          .where("startTime", ">=", fiveMinutesFromNow)
          .where("startTime", "<=", sixMinutesFromNow)
          .where("reminderSent", "==", false)
          .get();

        if (agendaSnapshot.empty) continue;

        console.log(`User ${user.email} has ${agendaSnapshot.size} sessions starting soon`);

        for (const sessionDoc of agendaSnapshot.docs) {
          const session = sessionDoc.data();
          const sessionId = sessionDoc.id;

          try {
            const notificationId = await sendOneSignalNotification(
              user.oneSignalPlayerId,
              "Session Starting Soon!",
              `Your "${session.title}" starts in 5 minutes.`,
              { sessionId }
            );

            await sessionDoc.ref.update({
              reminderSent: true,
              reminderSentAt: Timestamp.now(),
              oneSignalNotificationId: notificationId,
            });

            console.log(`✅ Sent reminder for ${session.title} to ${user.email}`);
          } catch (err) {
            console.error(`❌ Failed to send reminder for session ${sessionId}:`, err);
          }
        }
      }

      console.log("Finished processing all user reminders.");
      return null;
    } catch (error) {
      console.error("Error in sendSessionReminders:", error);
      return null;
    }
  }
);

// 🧪 Manual trigger for testing - ACTUALLY SENDS NOTIFICATIONS
export const sendSessionRemindersManual = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    try {
      const now = Timestamp.now();
      const fiveMinutesFromNow = Timestamp.fromMillis(now.toMillis() + 5 * 60 * 1000);
      const sixMinutesFromNow = Timestamp.fromMillis(now.toMillis() + 6 * 60 * 1000);

      console.log(`[MANUAL] Checking agendas for sessions between ${fiveMinutesFromNow.toDate()} and ${sixMinutesFromNow.toDate()}`);

      const usersSnapshot = await db.collection("users").get();
      const results = [];

      if (usersSnapshot.empty) {
        return res.status(200).json({
          message: "No users found",
          results: [],
        });
      }

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const userResult = {
          userId: userDoc.id,
          email: user.email,
          hasPlayerId: !!user.oneSignalPlayerId,
          playerId: user.oneSignalPlayerId || null,
          sessionsFound: 0,
          notificationsSent: 0,
          errors: [],
        };

        // Skip users without OneSignal Player ID
        if (!user.oneSignalPlayerId) {
          userResult.errors.push("No OneSignal Player ID found");
          results.push(userResult);
          continue;
        }

        // Query user's agenda for sessions starting in 5 minutes
        const agendaRef = db.collection(`users/${userDoc.id}/agenda`);
        const agendaSnapshot = await agendaRef
          .where("startTime", ">=", fiveMinutesFromNow)
          .where("startTime", "<=", sixMinutesFromNow)
          .where("reminderSent", "==", false)
          .get();

        userResult.sessionsFound = agendaSnapshot.size;

        if (!agendaSnapshot.empty) {
          console.log(`[MANUAL] User ${user.email} has ${agendaSnapshot.size} sessions starting soon`);

          for (const sessionDoc of agendaSnapshot.docs) {
            const session = sessionDoc.data();
            const sessionId = sessionDoc.id;

            try {
              // Send notification
              const notificationId = await sendOneSignalNotification(
                user.oneSignalPlayerId,
                "Session Starting Soon!",
                `Your "${session.title}" starts in 5 minutes.`,
                { sessionId, title: session.title }
              );

              // Update session document
              await sessionDoc.ref.update({
                reminderSent: true,
                reminderSentAt: Timestamp.now(),
                oneSignalNotificationId: notificationId,
              });

              userResult.notificationsSent++;
              console.log(`[MANUAL] ✅ Sent reminder for "${session.title}" to ${user.email}`);
            } catch (err) {
              const errorMsg = `Failed to send notification for session "${session.title}": ${err.message}`;
              userResult.errors.push(errorMsg);
              console.error(`[MANUAL] ❌ ${errorMsg}`);
            }
          }
        }

        results.push(userResult);
      }

      const totalNotifications = results.reduce((sum, r) => sum + r.notificationsSent, 0);
      const totalSessions = results.reduce((sum, r) => sum + r.sessionsFound, 0);

      console.log(`[MANUAL] Finished. Sent ${totalNotifications} notifications for ${totalSessions} sessions`);

      res.status(200).json({
        message: "Manual reminder check complete",
        timestamp: new Date().toISOString(),
        checkWindow: {
          start: fiveMinutesFromNow.toDate(),
          end: sixMinutesFromNow.toDate(),
        },
        summary: {
          totalUsers: results.length,
          totalSessions: totalSessions,
          totalNotificationsSent: totalNotifications,
          usersWithoutPlayerId: results.filter(r => !r.hasPlayerId).length,
        },
        results,
      });
    } catch (error) {
      console.error("[MANUAL] Error:", error);
      res.status(500).json({
        error: "Error processing manual reminder check",
        message: error.message,
        stack: error.stack,
      });
    }
  }
);