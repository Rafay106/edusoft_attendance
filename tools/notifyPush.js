const asyncHandler = require("express-async-handler");
const OneSignal = require("onesignal-node");
const { default: axios } = require("axios");
const PushQueue = require("../models/pushQueueModel");

const notifyPushQueue = async (msg, studentId) => {
  await PushQueue.create({ msg, studentId });
};

const sendPushNotification = asyncHandler(async () => {
  const pushes = await PushQueue.find().sort("createdBy").limit(10).lean();

  const client = new OneSignal.Client(
    process.env.ONESIGNAL_APP_ID,
    process.env.ONESIGNAL_API_KEY
  );

  for (const push of pushes) {
    const notification = {
      contents: {
        en: push.msg,
      },
      include_external_user_ids: [push.student],
    };

    try {
      const response = await client.createNotification(notification);
      console.log(response.body.id);
    } catch (e) {
      if (e instanceof OneSignal.HTTPError) {
        console.log(e.statusCode);
        console.log(e.body);
      }
    }
  }
});

module.exports = {
  notifyPushQueue,
  sendPushNotification,
};
