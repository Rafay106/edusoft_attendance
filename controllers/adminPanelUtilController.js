const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const C = require("../constants");

// @desc    Get managers
// @route   GET /api/admin-panel/util/manager-list
// @access  Private
const getManagerList = asyncHandler(async (req, res) => {
  const search = req.query.search;
  const managerList = [];

  if (!C.isAdmin(req.user.type)) return res.status(200).json(managerList);

  if (!search) {
    const managers = await User.find({ type: C.MANAGER })
      .select("email")
      .sort("email")
      .limit(20)
      .lean();

    managers.forEach((m) => managerList.push(m));

    return res.status(200).json(managerList);
  }

  const managers = await User.find({
    type: C.MANAGER,
    $or: [
      { email: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
    ],
  })
    .select("email")
    .sort("email")
    .lean();

  managers.forEach((m) => managerList.push(m));

  res.status(200).json(managerList);
});

// @desc    Get users
// @route   GET /api/admin-panel/util/user-list
// @access  Private
const getUserList = asyncHandler(async (req, res) => {
  const search = req.query.search;
  const user = [];

  const query = {
    type: C.USER,
  };

  if (C.isManager(req.user.type)) query.manager = req.user._id;

  if (!search) {
    const users = await User.find(query)
      .select("email")
      .sort("email")
      .limit(20)
      .lean();

    users.forEach((u) => user.push(u));

    return res.status(200).json(user);
  }

  query["$or"] = [
    { email: { $regex: search, $options: "i" } },
    { name: { $regex: search, $options: "i" } },
  ];

  const users = await User.find(query).select("email").sort("email").lean();

  users.forEach((u) => user.push(u));

  res.status(200).json(user);
});

module.exports = {
  getManagerList,
  getUserList,
};
