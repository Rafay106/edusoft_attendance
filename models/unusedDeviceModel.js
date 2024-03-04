const mongoose = require("mongoose");
const { any } = require("../plugins/schemaPlugins");
const { isIMEIValid } = require("../utils/validators");

const schema = new mongoose.Schema(
  {
    imei: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator: isIMEIValid,
        message: "Invalid imei!",
      },
      uppercase: true,
    },
    protocol: { type: String, required: true },
    net_protocol: { type: String, required: true },
    ip: { type: String, required: true },
    port: { type: String, required: true },
    dt_server: { type: Date, required: true },
    count: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false }
);

schema.plugin(any);

const UnusedDevice = mongoose.model("devices_unused", schema);
module.exports = UnusedDevice;
