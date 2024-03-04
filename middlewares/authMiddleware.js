const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const C = require("../constants");
const Student = require("../models/studentModel");

const adminAuthenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];

    try {
      const decode = jwt.verify(token, process.env.SECRET);

      req.user = await User.findById(decode._id).select("-password").lean();

      if (!req.user) {
        res.status(404);
        throw new Error("404");
      }
    } catch (err) {
      res.status(401);
      throw new Error("Not Authorized!");
    }

    next();
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

const parentAuthenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];

    try {
      const decode = jwt.verify(token, process.env.SECRET);

      req.user = await Student.findById(decode._id).lean();

      if (!req.user) {
        res.status(404);
        throw new Error("404");
      }
    } catch (err) {
      res.status(401);
      throw new Error("Not Authorized!");
    }

    next();
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

const adminAuthorize = asyncHandler(async (req, res, next) => {
  const userType = req.user.type;

  const allowedTypes = [C.SUPERADMIN, C.ADMIN, C.MANAGER];
  const admins = [C.SUPERADMIN, C.ADMIN];

  if (!allowedTypes.includes(userType)) {
    res.status(404);
    throw new Error(C.URL_404);
  }

  console.log("req.baseUrl :>> ", req.baseUrl);
  console.log("req.url :>> ", req.url);

  if (admins.includes(userType)) {
    next();
  } else if (userType === C.MANAGER) {
    // Allow only some resources
    if (req.baseUrl === "/api/admin") {
      if (req.url.includes("/bus")) next();
      else if (req.url.includes("/student")) next();
      else {
        res.status(404);
        throw new Error(C.URL_404);
      }
    }
  } else {
    res.status(404);
    throw new Error(C.URL_404);
  }
});

module.exports = { adminAuthenticate, parentAuthenticate, adminAuthorize };
