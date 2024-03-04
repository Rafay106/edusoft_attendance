const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const C = require("../constants");
const { isEmailValid } = require("../utils/validators");
const { any } = require("../plugins/schemaPlugins");

const schema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, C.FIELD_IS_REQ],
      validate: {
        validator: isEmailValid,
        message: C.FIELD_IS_INVALID,
      },
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: [true, C.FIELD_IS_REQ] },
    name: { type: String, required: [true, C.FIELD_IS_REQ] },
    mobile: { type: String, required: [true, C.FIELD_IS_REQ] },
    type: {
      type: String,
      required: [true, C.FIELD_IS_REQ],
      enum: {
        values: [C.SUPERADMIN, C.ADMIN, C.MANAGER, C.PARENT, C.STUDENT],
        message: C.VALUE_NOT_SUP,
      },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  },
  { timestamps: true }
);

schema.index({ email: 1 }, { unique: true });

schema.pre("save", async function (next) {
  if (!this.isModified("password")) next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

schema.plugin(any);

const User = mongoose.model("users", schema);
module.exports = User;
