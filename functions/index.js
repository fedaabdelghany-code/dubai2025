const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onRequest} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const axios = require("axios");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// OneSignal configuration
const ONESIGNAL_APP_ID = "e4848b1f-7e63-4dce-a616-0cdf07c79b4e";
const ONESIGNAL_REST_API_KEY = "os_v2_app_4sciwh36mng45jqwbtpqpr43j3u64vdturqeginba6mbrxtlcobd5zyp5ahij3pu6e35pzit2e4mpwiaipdhj5yoidrs7sogfrtxtpq";

// Run every minute to check for upcoming sessions
exports.sendSessionReminders = onSchedule("every 1 minutes", async (event) => {
  try {
    const now = Timestamp.now();
    const fiveMinutesFromNow = Timestamp.fromMillis(
        now.toMillis() + 5 * 60 * 1000,
    );
    const sixMinutesFromNow = Timestamp.fromMillis(
        now.toMillis() + 6 * 60 * 1000,
    );

    console.log(
        "Checking for sessions between:",
        fiveMinutesFromNow.toDate(),
        "and",
        sixMinutesFromNow.toDate(),
    );

    // Find sessions starting in 5-6 minutes that haven't been notified
    const sessionsSnapshot = await db
        .collection("sessions")
        .where("startTime", ">=", fiveMinutesFromNow)
        .where("startTime", "<=", sixMinutesFromNow)
        .where("reminderSent", "==", false)
        .get();

    if (sessionsSnapshot.empty) {
      console.log("No sessions found needing reminders");
      return null;
    }

    console.log(
        `Found ${sessionsSnapshot.size} sessions needing reminders`,
    );

    // Process each session
    const notificationPromises = sessionsSnapshot.docs.map(
        async (sessionDoc) => {
          const session = sessionDoc.data();
          const sessionId = sessionDoc.id;

          try {
            // Get user data
            const userDoc = await db
                .collection("users")
                .doc(session.userId)
                .get();

            if (!userDoc.exists) {
              console.log(
                  `User ${session.userId} not found for ` +
                  `session ${sessionId}`,
              );
              return null;
            }

            const user = userDoc.data();

            // Check if user has OneSignal player ID
            if (!user.oneSignalPlayerId) {
              console.log(
                  `User ${session.userId} has no OneSignal player ID`,
              );
              return null;
            }

            // Send OneSignal notification
            const notificationData = {
              app_id: ONESIGNAL_APP_ID,
              include_player_ids: [user.oneSignalPlayerId],
              headings: {en: "Session Starting Soon!"},
              contents: {
                en: `Your "${session.title ||
                  "session"}" starts in 5 minutes`,
              },
              data: {
                sessionId: sessionId,
                type: "session_reminder",
                startTime: session.startTime,
              },
              buttons: [
                {id: "view", text: "View Session"},
                {id: "dismiss", text: "Dismiss"},
              ],
            };

            const response = await axios.post(
                "https://onesignal.com/api/v1/notifications",
                notificationData,
                {
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
                  },
                },
            );

            console.log(
                `Notification sent for session ${sessionId}:`,
                response.data.id,
            );

            // Mark session as notified
            await sessionDoc.ref.update({
              reminderSent: true,
              reminderSentAt: Timestamp.now(),
              oneSignalNotificationId: response.data.id,
            });

            return response.data;
          } catch (error) {
            console.error(
                `Error processing session ${sessionId}:`,
                error,
            );
            return null;
          }
        },
    );

    await Promise.all(notificationPromises);
    console.log("Finished processing session reminders");

    return null;
  } catch (error) {
    console.error("Error in sendSessionReminders:", error);
    return null;
  }
});

// Optional: Manual trigger function for testing
exports.sendSessionRemindersManual = onRequest(async (req, res) => {
  try {
    const now = Timestamp.now();
    const fiveMinutesFromNow = Timestamp.fromMillis(
        now.toMillis() + 5 * 60 * 1000,
    );
    const sixMinutesFromNow = Timestamp.fromMillis(
        now.toMillis() + 6 * 60 * 1000,
    );

    const sessionsSnapshot = await db
        .collection("sessions")
        .where("startTime", ">=", fiveMinutesFromNow)
        .where("startTime", "<=", sixMinutesFromNow)
        .where("reminderSent", "==", false)
        .get();

    res.status(200).json({
      message: "Check complete",
      sessionsFound: sessionsSnapshot.size,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing reminders");
  }
});

// Optional: Add reminder field to existing sessions (run once)
exports.addReminderFieldToSessions = onRequest(async (req, res) => {
  try {
    const sessionsSnapshot = await db.collection("sessions").get();

    const batch = db.batch();
    let count = 0;

    sessionsSnapshot.docs.forEach((doc) => {
      if (doc.data().reminderSent === undefined) {
        batch.update(doc.ref, {reminderSent: false});
        count++;
      }
    });

    await batch.commit();
    res.status(200).send(
        `Updated ${count} sessions with reminderSent field`,
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating sessions");
  }
});
