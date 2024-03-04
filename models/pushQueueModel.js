const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    msg: { type: String, required: true },
    student: { type: mongoose.SchemaTypes.ObjectId, ref: "students" },
  },
  { timestamps: true }
);

const PushQueue = mongoose.model("queue_push_notifications", schema);
module.exports = PushQueue;
