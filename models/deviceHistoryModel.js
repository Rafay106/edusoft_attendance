const mongoose = require("mongoose");

const deviceHistorySchema = new mongoose.Schema(
  {
    dt_server: { type: Date, required: true },
    dt_tracker: { type: Date, required: true },
    lat: { type: String, required: true },
    lng: { type: String, required: true },
    altitude: { type: String, required: true },
    angle: { type: String, required: true },
    speed: { type: String, required: true },
    params: { type: {}, required: true },
    odometer: { type: String, required: true },
    engine_hours: { type: String, required: true },
  },
  { versionKey: false }
);

const getDeviceHistoryModel = (imei) => {
  const deviceHistoryModelName = `Device_${imei}`;
  let DeviceHistory;
  try {
    DeviceHistory = mongoose.model(deviceHistoryModelName, deviceHistorySchema);
  } catch (e) {
    DeviceHistory = mongoose.model(deviceHistoryModelName);
  }
  return DeviceHistory;
};

module.exports = getDeviceHistoryModel;
