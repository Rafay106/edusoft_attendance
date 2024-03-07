const Bus = require("../models/busModel");
const getDeviceHistoryModel = require("../models/deviceHistoryModel");

const serviceClearHistory = async () => {
  const days = parseInt(process.env.HISTORY_PERIOD);

  if (!days || isNaN(days)) return;

  if (days < 30) return;

  const buses = await Bus.find().select("device.imei").sort("imei");

  for (const bus of buses) {
    const DeviceHistory = getDeviceHistoryModel(bus.device.imei);

    await DeviceHistory.deleteMany({
      dt_tracker: {
        $lt: new Date().setUTCDate(new Date().getUTCDate() - days),
      },
    });
  }
};

module.exports = { serviceClearHistory };
