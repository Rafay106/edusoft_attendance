const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const C = require("../constants");
const Student = require("../models/studentModel");

const authenticate = asyncHandler(async (req, res, next) => {
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

const adminPanelAuthorize = asyncHandler(async (req, res, next) => {
  const baseurl = req.baseUrl;
  const url = req.url;
  console.log("baseurl :>> ", baseurl);
  console.log("url :>> ", url);

  if (baseurl !== "/api/admin-panel") return next();

  const userType = req.user.type;

  if (C.isAdmin(userType)) {
    next();
  } else if (C.isManager(userType)) {
    next();
  } else if (C.isUser(userType)) {
    if (req.url.includes("/bus")) next();
    else if (req.url.includes("/bus-stop")) next();
    else if (req.url.includes("/student")) next();
    else if (req.url.includes("/attendance")) next();
    else {
      res.status(404);
      throw new Error(C.URL_404);
    }
  } else {
    res.status(404);
    throw new Error(C.URL_404);
  }
});

module.exports = { authenticate, parentAuthenticate, adminPanelAuthorize };
