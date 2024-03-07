const mongoose = require("mongoose");
const C = require("../constants");
const { any } = require("../plugins/schemaPlugins");

const schema = new mongoose.Schema(
  {
    name: {
      f: { type: String, required: [true, C.FIELD_IS_REQ], uppercase: true },
      m: { type: String, default: "", uppercase: true },
      l: { type: String, required: [true, C.FIELD_IS_REQ], uppercase: true },
    },
    phone: { type: String, required: [true, C.FIELD_IS_REQ] },
    email: { type: String, required: [true, C.FIELD_IS_REQ] },
    admissionNo: {
      type: String,
      required: [true, C.FIELD_IS_REQ],
      uppercase: true,
    },
    rfid: { type: String, default: "", uppercase: true },
    doa: { type: Date, required: [true, C.FIELD_IS_REQ] },
    dob: { type: Date, required: [true, C.FIELD_IS_REQ] },
    gender: {
      type: String,
      required: [true, C.FIELD_IS_REQ],
      enum: {
        values: ["m", "f", "o"],
        message: C.VALUE_NOT_SUP,
      },
    },
    photo: { type: String, default: "" },
    school: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "schools",
      required: [true, C.FIELD_IS_REQ],
    },
    bus: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "buses",
      required: [true, C.FIELD_IS_REQ],
    },
    busStop: [{ type: mongoose.SchemaTypes.ObjectId, ref: "bus_stops" }],
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "users",
      required: [true, C.FIELD_IS_REQ],
    },
    manager: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "users",
      required: [true, C.FIELD_IS_REQ],
    },
    createdBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "users",
      required: [true, C.FIELD_IS_REQ],
    },
  },
  { timestamps: true }
);

schema.index({ admissionNo: 1 }, { unique: true });
schema.index({ rfid: 1 }, { unique: true });

schema.pre("updateOne", function (next) {
  this.setOptions({ runValidators: true });
  next();
});

schema.pre("updateMany", function (next) {
  this.setOptions({ runValidators: true });
  next();
});

schema.plugin(any);

const Student = mongoose.model("students", schema);
module.exports = Student;
