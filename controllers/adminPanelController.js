const fs = require("node:fs");
const path = require("node:path");
const asyncHandler = require("express-async-handler");
const C = require("../constants");
const UC = require("../utils/common");
const School = require("../models/schoolModel");
const User = require("../models/userModel");
const Bus = require("../models/busModel");
const Student = require("../models/studentModel");
const BusStop = require("../models/busStopModel");

/** 1. User */

// @desc    Get Users
// @route   GET /api/admin-panel/user
// @access  Private
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "email";
  const searchField = req.query.sf;
  const searchValue = req.query.sv;

  const query = {};

  if (C.isManager(req.user.type)) query.manager = req.user._id;

  if (searchField && searchValue) {
    if (searchField === "all") {
      const fields = ["email", "name", "mobile", "type"];

      const searchQuery = UC.createSearchQuery(fields, searchValue);
      query["$or"] = searchQuery["$or"];
    } else {
      const searchQuery = UC.createSearchQuery([searchField], searchValue);
      query["$or"] = searchQuery["$or"];
    }
  }

  const select = "email name mobile type manager";

  const results = await UC.paginatedQuery(
    User,
    query,
    select,
    page,
    limit,
    sort,
    ["manager", "email"]
  );

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json(results);
});

// @desc    Get a User
// @route   GET /api/admin-panel/user/:id
// @access  Private
const getUser = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (C.isManager(req.user.type)) query.manager = req.user._id;

  const user = await User.findOne(query)
    .select("-password")
    .populate("manager createdBy", "emali")
    .lean();

  if (!user) {
    res.status(404);
    throw new Error(C.getResourse404Error("User", req.params.id));
  }

  res.status(200).json(user);
});

// @desc    Get required data to create a user
// @route   GET /api/admin-panel/user/required-data
// @access  Private
const requiredDataUser = asyncHandler(async (req, res) => {
  const type = [];

  if (C.isManager(req.user.type)) {
    type.push(C.USER);
  } else if (req.user.type === C.ADMIN) {
    type.push(C.MANAGER);
  } else if (req.user.type === C.SUPERADMIN) {
    type.push(C.MANAGER, C.ADMIN, C.SUPERADMIN);
  }

  res.status(200).json({
    type: type.sort(),
  });
});

// @desc    Create a User
// @route   POST /api/admin-panel/user
// @access  Private
const createUser = asyncHandler(async (req, res) => {
  const { email, name, mobile } = req.body;
  let type = req.body.type;
  let manager = req.body.manager;

  // validate type
  if (req.user.type === C.ADMIN) {
    if (C.isAdmin(type)) {
      res.status(400);
      throw new Error("type can only be manager or user");
    }
  }

  // validate manager
  if (C.isAdmin(req.user.type) && type === C.USER) {
    if (!manager) {
      res.status(400);
      throw new Error(C.getFieldIsReq("manager"));
    }

    if (!(await User.any({ _id: manager }))) {
      res.status(400);
      throw new Error(C.getResourse404Error("manager", manager));
    }
  }

  if (C.isManager(req.user.type)) {
    type = C.USER;
    manager = req.user._id;
  }

  const user = await User.create({
    email,
    password: "123456",
    name,
    mobile,
    type,
    manager,
    createdBy: req.user._id,
  });

  res.status(201).json({ msg: user._id });
});

// @desc    Update a User
// @route   PATCH /api/admin-panel/user/:id
// @access  Private
const updateUser = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (C.isManager(req.user.type)) query.manager = req.user._id;

  if (!(await User.any(query))) {
    res.status(404);
    throw new Error(C.getResourse404Error("User", req.params.id));
  }

  const result = await User.updateOne(query, {
    $set: {
      email: req.body.email,
      name: req.body.name,
      mobile: req.body.mobile,
    },
  });

  res.status(200).json(result);
});

// @desc    Delete a user
// @route   DELETE /api/admin-panel/user/:id
// @access  Private
const deleteUser = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (C.isManager(req.user.type)) query.manager = req.user._id;

  const result = await User.deleteOne(query);

  res.status(200).json(result);
});

/** 2. School */

// @desc    Get all schools
// @route   GET /api/admin-panel/school
// @access  Private
const getSchools = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const searchField = req.query.sf;
  const searchValue = req.query.sv;

  const query = {};

  if (C.isManager(req.user.type)) query.manager = req.user._id;

  if (searchField && searchValue) {
    if (searchField === "all") {
      const fields = [
        "name",
        "email",
        "phone",
        "address",
        "country",
        "state",
        "city",
        "pincode",
      ];

      const searchQuery = UC.createSearchQuery(fields, searchValue);
      query["$or"] = searchQuery["$or"];
    } else {
      const searchQuery = UC.createSearchQuery([searchField], searchValue);
      query["$or"] = searchQuery["$or"];
    }
  }

  const results = await UC.paginatedQuery(
    School,
    query,
    "name email phone address",
    page,
    limit,
    sort
  );

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json(results);
});

// @desc    Get a school
// @route   GET /api/admin-panel/school/:id
// @access  Private
const getSchool = asyncHandler(async (req, res) => {
  const school = await School.findOne({ _id: req.params.id })
    .populate("user manager", "email")
    .lean();

  if (!school) {
    res.status(404);
    throw new Error(C.getResourse404Error("School", req.params.id));
  }

  res.status(200).json(school);
});

// @desc    Add a school
// @route   POST /api/admin-panel/school
// @access  Private
const addSchool = asyncHandler(async (req, res) => {
  let manager = req.body.manager;
  let user = req.body.user;

  if (C.isManager(req.user.type)) manager = req.user._id;

  if (!(await User.any({ _id: manager }))) {
    res.status(400);
    throw new Error(C.getResourse404Error("manager", manager));
  }

  if (!(await User.any({ _id: user }))) {
    res.status(400);
    throw new Error(C.getResourse404Error("user", user));
  }

  const school = await School.create({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    country: req.body.country,
    state: req.body.state,
    city: req.body.city,
    pincode: req.body.pincode,
    lat: parseFloat(req.body.lat).toFixed(6),
    lon: parseFloat(req.body.lon).toFixed(6),
    radius: req.body.radius,
    timings: req.body.timings,
    user: req.body.user,
    manager: req.body.manager,
  });

  res.status(201).json({ msg: school._id });
});

// @desc    Update a school
// @route   PUT /api/admin-panel/school/:id
// @access  Private
const updateSchool = asyncHandler(async (req, res) => {
  if (!(await School.any({ _id: req.params.id }))) {
    res.status(400);
    throw new Error(C.getResourse404Error("School", req.params.id));
  }

  if (req.body.manager) {
    if (!(await User.any({ _id: req.body.manager }))) {
      res.status(400);
      throw new Error(C.getResourse404Error("manager", req.body.manager));
    }
  }

  if (req.body.user) {
    if (!(await User.any({ _id: req.body.user }))) {
      res.status(400);
      throw new Error(C.getResourse404Error("user", req.body.user));
    }
  }

  const lat = req.body.lat ? parseFloat(req.body.lat).toFixed(6) : undefined;
  const lon = req.body.lon ? parseFloat(req.body.lon).toFixed(6) : undefined;

  const result = await School.updateOne(
    { _id: req.params.id },
    {
      $set: {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        country: req.body.country,
        state: req.body.state,
        city: req.body.city,
        pincode: req.body.pincode,
        lat,
        lon,
        radius: req.body.radius,
        "timings.morning": req.body.timings?.morning,
        "timings.afternoon": req.body.timings?.afternoon,
        user: req.body.user,
        manager: req.body.manager,
      },
    }
  );

  res.status(200).json(result);
});

// @desc    Delete a school
// @route   DELETE /api/admin-panel/school/:id
// @access  Private
const deleteSchool = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (C.isManager(req.user.type)) query.manager = req.user._id;

  const result = await School.deleteOne(query);

  res.status(200).json(result);
});

// TODO
// @desc    Bulk operations for school
// @route   POST /api/admin-panel/school/bulk
// @access  Private
const bulkOpsSchool = asyncHandler(async (req, res) => {
  const cmd = req.body.cmd;
  const schools = req.body.schools;

  if (!cmd) {
    res.status(400);
    throw new Error("cmd is required!");
  }

  if (cmd === "import") {
    const fileData = JSON.parse(req.file.buffer.toString("utf8"));

    const result = await UC.addMultipleSchools(req.user._id, fileData);

    if (result.status === 400) {
      res.status(result.status);
      throw new Error(result.body);
    }

    return res.status(200).json({ msg: result.msg });
  }

  if (!schools) {
    res.status(400);
    throw new Error(C.getFieldIsReq("schools"));
  }

  if (schools.length === 0) {
    res.status(400);
    throw new Error("schools array is empty!");
  }

  const query = [C.SUPERADMIN, C.ADMIN].includes
    ? { _id: schools }
    : { _id: schools, manager: req.user._id };

  if (cmd === "delete") {
    const result = await School.deleteMany(query);

    return res.status(200).json({ msg: result });
  } else if (cmd === "export-json") {
    const schoolsToExport = await School.find(query)
      .select("-createdAt -updatedAt")
      .sort("name")
      .lean();

    const dt = new Date();
    const Y = String(dt.getUTCFullYear()).padStart(2, "0");
    const M = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const D = String(dt.getUTCDate()).padStart(2, "0");

    const fileName = `Device_drivers_${Y}-${M}-${D}.json`;
    const fileDir = path.join(getAppRootDir(__dirname), "temp", fileName);

    fs.writeFileSync(fileDir, JSON.stringify(schoolsToExport));

    return res.download(fileDir, fileName, () => {
      fs.unlinkSync(fileDir);
    });
  } else {
    res.status(400);
    throw new Error("cmd not found!");
  }
});

/** 3. BusStop */

// @desc    Get all bus stops
// @route   GET /api/admin-panel/bus-stop
// @access  Private
const getBusStops = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const searchField = req.query.sf;
  const searchValue = req.query.sv;

  const query = {};

  if (C.isUser(req.user.type)) query.user = req.user._id;
  else if (C.isManager(req.user.type)) query.manager = req.user._id;

  if (searchField && searchValue) {
    if (searchField === "all") {
      const fields = ["name", "address", "user.name", "manager.name"];

      const searchQuery = UC.createSearchQuery(fields, searchValue);
      query["$or"] = searchQuery["$or"];
    } else {
      const searchQuery = UC.createSearchQuery([searchField], searchValue);
      query["$or"] = searchQuery["$or"];
    }
  }

  const results = await UC.paginatedQuery(
    BusStop,
    query,
    "name address",
    page,
    limit,
    sort
  );

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json(results);
});

// @desc    Get a bus-stop
// @route   GET /api/admin-panel/bus-stop/:id
// @access  Private
const getBusStop = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (C.isUser(req.user.type)) query.user = req.user._id;
  else if (C.isManager(req.user.type)) query.manager = req.user._id;

  const busStop = await BusStop.findOne(query)
    .populate("user manager", "name")
    .lean();

  if (!busStop) {
    res.status(404);
    throw new Error(C.getResourse404Error("BusStop", req.params.id));
  }

  res.status(200).json(busStop);
});

// @desc    Add a bus-stop
// @route   POST /api/admin-panel/bus-stop
// @access  Private
const addBusStop = asyncHandler(async (req, res) => {
  let user = req.body.user;
  let manager = req.body.manager;

  if (C.isUser(req.user.type)) {
    user = req.user._id;
    manager = req.user.manager;
  }

  const userQuery = { _id: user };

  if (C.isManager(req.user.type)) {
    userQuery.manager = req.user._id;
    manager = req.user._id;
  }

  if (!(await User.any(userQuery))) {
    res.status(400);
    throw new Error(C.getResourse404Error("user", user));
  }

  if (!(await User.any({ _id: manager }))) {
    res.status(400);
    throw new Error(C.getResourse404Error("manager", manager));
  }

  const busStop = await BusStop.create({
    name: req.body.name,
    address: req.body.address,
    lat: req.body.lat,
    lon: req.body.lon,
    user,
    manager,
  });

  res.status(201).json({ msg: busStop._id });
});

// @desc    Update a bus-stop
// @route   PATCH /api/admin-panel/bus-stop/:id
// @access  Private
const updateBusStop = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (C.isUser(req.user.type)) query.user = req.user._id;
  else if (C.isManager(req.user.type)) query.manager = req.user._id;

  if (!(await BusStop.any(query))) {
    res.status(404);
    throw new Error(C.getResourse404Error("BusStop", req.params.id));
  }

  const result = await BusStop.updateOne(query, {
    $set: {
      name: req.body.name,
      address: req.body.address,
      lat: req.body.lat,
      lon: req.body.lon,
    },
  });

  res.status(200).json(result);
});

// @desc    Delete a bus-stop
// @route   DELETE /api/admin-panel/bus-stop/:id
// @access  Private
const deleteBusStop = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (C.isUser(req.user.type)) query.user = req.user._id;
  else if (C.isManager(req.user.type)) query.manager = req.user._id;

  const result = await BusStop.deleteOne(query);

  res.status(200).json(result);
});

/** 4. Bus */

// @desc    Get all buses
// @route   GET /api/admin-panel/bus
// @access  Private
const getBuses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const searchField = req.query.sf;
  const searchValue = req.query.sv;

  const query = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? {}
    : { manager: req.user._id };

  if (searchField && searchValue) {
    if (searchField === "all") {
      const fields = [
        "name",
        "status.value",
        "device.imei",
        "device.name",
        "device.protocol",
        "device.rfid",
        "createdBy.email",
      ];

      const searchQuery = UC.createSearchQuery(fields, searchValue);
      query["$or"] = searchQuery["$or"];
    } else {
      const searchQuery = UC.createSearchQuery([searchField], searchValue);
      query["$or"] = searchQuery["$or"];
    }
  }

  const results = await UC.paginatedQuery(Bus, query, {}, page, limit, sort, [
    "manager createdBy",
    "email",
  ]);

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json(results);
});

// @desc    Get a bus
// @route   GET /api/admin-panel/bus/:id
// @access  Private
const getBus = asyncHandler(async (req, res) => {
  const query = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: req.params.id }
    : { _id: req.params.id, manager: req.user._id };

  const bus = await Bus.findOne(query)
    .populate("manager createdBy", "email")
    .lean();

  if (!bus) {
    res.status(404);
    throw new Error(C.getResourse404Error("Bus", req.params.id));
  }

  res.status(200).json({ mnsg: bus });
});

// @desc    Add a bus
// @route   POST /api/admin-panel/bus
// @access  Private
const addBus = asyncHandler(async (req, res) => {
  let user = req.body.user;
  let manager = req.body.manager;

  if (C.isUser(req.user.type)) {
    user = req.user._id;
    manager = req.user.manager;
  }

  const userQuery = { _id: user };

  if (C.isManager(req.user.type)) {
    userQuery.manager = req.user._id;
    manager = req.user._id;
  }

  if (!(await User.any(userQuery))) {
    res.status(400);
    throw new Error(C.getResourse404Error("user", user));
  }

  if (!(await User.any({ _id: manager }))) {
    res.status(400);
    throw new Error(C.getResourse404Error("manager", manager));
  }

  const bus = await Bus.create({
    name: req.body.name,
    device: req.body.device,
    mobile: req.body.mobile,
    user,
    manager,
  });

  res.status(201).json({ msg: bus._id });
});

// @desc    Update a bus
// @route   PUT /api/admin-panel/bus/:id
// @access  Private
const updateBus = asyncHandler(async (req, res) => {
  const matchQuery = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: req.params.id }
    : { _id: req.params.id, manager: req.user._id };

  const bus = await Bus.findOne(matchQuery).select("_id").lean();

  if (!bus) {
    res.status(404);
    throw new Error(C.getResourse404Error("Bus", req.params.id));
  }

  const result = await Bus.updateOne(matchQuery, {
    $set: {
      name: req.body.name,
      "device.name": req.body.device.name,
    },
  });

  res.status(200).json({ msg: result });
});

// @desc    Delete a bus
// @route   DELETE /api/admin-panel/bus/:id
// @access  Private
const deleteBus = asyncHandler(async (req, res) => {
  const query = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: req.params.id }
    : { _id: req.params.id, manager: req.user._id };

  const result = await Bus.deleteOne(query);

  if (result.deletedCount === 0) {
    res.status(404);
    throw new Error(C.getResourse404Error("Bus", req.params.id));
  }

  res.status(200).json({ msg: result });
});

// @desc    Bulk operations for bus
// @route   POST /api/admin-panel/bus/bulk
// @access  Private
const bulkOpsBus = asyncHandler(async (req, res) => {
  const cmd = req.body.cmd;
  const buses = req.body.buses;

  if (!cmd) {
    res.status(400);
    throw new Error("cmd is required!");
  }

  if (cmd === "import") {
    const fileData = JSON.parse(req.file.buffer.toString("utf8"));

    const result = await UC.addMultipleBuses(req.user._id, fileData);

    if (result.status === 400) {
      res.status(result.status);
      throw new Error(result.body);
    }

    return res.status(200).json({ msg: result.msg });
  }

  if (!buses) {
    res.status(400);
    throw new Error(C.getFieldIsReq("buses"));
  }

  if (buses.length === 0) {
    res.status(400);
    throw new Error("buses array is empty!");
  }

  if (cmd === "delete") {
    const result = await Bus.deleteMany({
      _id: buses,
      createdBy: req.user._id,
    });

    return res.status(200).json({ ...result });
  } else if (cmd === "export-json") {
    const busesToExport = await Bus.find({
      _id: buses,
      createdBy: req.user._id,
    })
      .select("-createdAt -updatedAt")
      .sort("name")
      .lean();

    const dt = new Date();
    const Y = String(dt.getUTCFullYear()).padStart(2, "0");
    const M = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const D = String(dt.getUTCDate()).padStart(2, "0");

    const fileName = `Device_drivers_${Y}-${M}-${D}.json`;
    const fileDir = path.join(getAppRootDir(__dirname), "temp", fileName);

    fs.writeFileSync(fileDir, JSON.stringify(busesToExport));

    return res.download(fileDir, fileName, () => {
      fs.unlinkSync(fileDir);
    });
  } else {
    res.status(400);
    throw new Error("cmd not found!");
  }
});

/** 5. Student */

// @desc    Get all students
// @route   GET /api/admin-panel/student
// @access  Private
const getStudents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const searchField = req.query.sf;
  const searchValue = req.query.sv;

  const query = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? {}
    : { manager: req.user._id };

  if (searchField && searchValue) {
    if (searchField === "all") {
      const fields = [
        "name.f",
        "name.m",
        "name.l",
        "phone",
        "email",
        "admissionNo",
        "gender",
      ];

      const searchQuery = UC.createSearchQuery(fields, searchValue);
      query["$or"] = searchQuery["$or"];
    } else {
      const searchQuery = UC.createSearchQuery([searchField], searchValue);
      query["$or"] = searchQuery["$or"];
    }
  }

  const results = await UC.paginatedQuery(
    Student,
    query,
    {},
    page,
    limit,
    sort,
    ["createdBy", "email"]
  );

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json(results);
});

// @desc    Get a student
// @route   GET /api/admin-panel/student/:id
// @access  Private
const getStudent = asyncHandler(async (req, res) => {
  const query = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: req.params.id }
    : { _id: req.params.id, manager: req.user._id };

  const student = await Student.findOne(query)
    .populate("createdBy", "email")
    .lean();

  if (!student) {
    res.status(404);
    throw new Error(C.getResourse404Error("Student", req.params.id));
  }

  res.status(200).json({ msg: student });
});

// @desc    Add a student
// @route   POST /api/admin-panel/student
// @access  Private
const addStudent = asyncHandler(async (req, res) => {
  if (!req.body.fname) {
    res.status(400);
    throw new Error(C.getFieldIsReq("fname"));
  }
  if (!req.body.lname) {
    res.status(400);
    throw new Error(C.getFieldIsReq("lname"));
  }

  const name = {
    f: req.body.fname,
    m: req.body.mname,
    l: req.body.lname,
  };

  if (!req.body.school) {
    res.status(400);
    throw new Error(C.getFieldIsReq("school"));
  }

  if (!req.body.bus) {
    res.status(400);
    throw new Error(C.getFieldIsReq("bus"));
  }

  const schoolQuery = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: req.body.school }
    : { _id: req.body.school, manager: req.user._id };

  if (!(await School.any(schoolQuery))) {
    res.status(400);
    throw new Error(C.getResourse404Error("School", req.body.school));
  }

  const busQuery = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: req.body.bus }
    : { _id: req.body.bus, manager: req.user._id };

  if (!(await Bus.any(busQuery))) {
    res.status(400);
    throw new Error(C.getResourse404Error("Bus", req.body.bus));
  }

  const photo = req.file.path
    .toString()
    .replace("uploads\\", "")
    .replace("\\", "/");

  const manager = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? req.body.manager
    : req.user._id;

  const student = await Student.create({
    name,
    phone: req.body.phone,
    email: req.body.email,
    admissionNo: req.body.admissionNo,
    doa: req.body.doa,
    dob: req.body.dob,
    gender: req.body.gender,
    photo,
    school: req.body.school,
    bus: req.body.bus,
    pickupLocations: req.body.pickupLocations,
    manager,
    createdBy: req.user._id,
  });

  res.status(201).json({ msg: student._id });
});

// @desc    Update a student
// @route   PUT /api/admin-panel/student/:id
// @access  Private
const updateStudent = asyncHandler(async (req, res) => {
  const query = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: req.params.id }
    : { _id: req.params.id, manager: req.user._id };

  if (!(await Student.any(query))) {
    res.status(400);
    throw new Error(C.getResourse404Error("Student", req.params.id));
  }

  let manager = req.body.manager;
  const isAdmin = [C.SUPERADMIN, C.ADMIN].includes(req.user.type);
  if (isAdmin && manager) {
    if (!(await User.any({ _id: manager }))) {
      res.status(400);
      throw new Error(C.getResourse404Error("User", manager));
    }
  } else manager = req.user._id;

  const result = await Student.updateOne(query, {
    $set: {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      country: req.body.country,
      state: req.body.state,
      city: req.body.city,
      pincode: req.body.pincode,
      lat: parseFloat(req.body.lat).toFixed(6),
      lon: parseFloat(req.body.lon).toFixed(6),
      radius: req.body.radius,
      manager,
    },
  });

  res.status(200).json({ msg: result });
});

// @desc    Delete a student
// @route   DELETE /api/admin-panel/student/:id
// @access  Private
const deleteStudent = asyncHandler(async (req, res) => {
  const query = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: req.params.id }
    : { _id: req.params.id, manager: req.user._id };

  const result = await Student.deleteOne(query);

  if (result.deletedCount === 0) {
    res.status(400);
    throw new Error(C.getResourse404Error("Student", req.params.id));
  }

  res.status(200).json({ msg: result });
});

// @desc    Bulk operations for student
// @route   POST /api/admin-panel/student/bulk
// @access  Private
const bulkOpsStudent = asyncHandler(async (req, res) => {
  const cmd = req.body.cmd;
  const students = req.body.students;

  if (!cmd) {
    res.status(400);
    throw new Error("cmd is required!");
  }

  if (cmd === "import") {
    const fileData = UC.excelToJson(
      path.join("imports", "student", req.file.filename)
    );

    const result = await UC.addMultipleStudents(
      req.user._id,
      req.user.type,
      fileData
    );

    if (result.status === 400) {
      res.status(result.status);
      const err = new Error(result.errors);
      err.name = "BulkImportError";
      throw err;
    }

    console.log("req.file :>> ", req.file);

    fs.unlinkSync(path.join(req.file.path));

    return res.status(200).json({ msg: result.msg });
  }

  if (!students) {
    res.status(400);
    throw new Error(C.getFieldIsReq("students"));
  }

  if (students.length === 0) {
    res.status(400);
    throw new Error("students array is empty!");
  }

  const query = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: students }
    : { _id: students, manager: req.user._id };

  if (cmd === "delete") {
    const result = await Student.deleteMany(query);

    return res.status(200).json({ msg: result });
  } else if (cmd === "export-json") {
    const studentsToExport = await Student.find(query)
      .select("-createdAt -updatedAt")
      .sort("name")
      .lean();

    const dt = new Date();
    const Y = String(dt.getUTCFullYear()).padStart(2, "0");
    const M = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const D = String(dt.getUTCDate()).padStart(2, "0");

    const fileName = `Device_drivers_${Y}-${M}-${D}.json`;
    const fileDir = path.join(getAppRootDir(__dirname), "temp", fileName);

    fs.writeFileSync(fileDir, JSON.stringify(studentsToExport));

    return res.download(fileDir, fileName, () => {
      fs.unlinkSync(fileDir);
    });
  } else {
    res.status(400);
    throw new Error("cmd not found!");
  }
});

// @desc    Add pickup locations for student
// @route   POST /api/admin-panel/student/pik-loc/:id
// @access  Private
const addPickupLocation = asyncHandler(async (req, res) => {
  const query = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: req.params.id }
    : { _id: req.params.id, manager: req.user._id };

  if (!(await Student.any(query))) {
    res.status(400);
    throw new Error(C.getResourse404Error("Student", req.params.id));
  }

  const result = await Student.updateOne(query, {
    $push: {
      pickupLocations: {
        address: req.body.address,
        lat: parseFloat(req.body.lat).toFixed(6),
        lon: parseFloat(req.body.lon).toFixed(6),
        radius: req.body.radius,
      },
    },
  });

  res.status(200).json({ msg: result });
});

// @desc    Add pickup locations for student
// @route   DELETE /api/admin-panel/student/pik-loc/:id
// @access  Private
const removePickupLocation = asyncHandler(async (req, res) => {
  const query = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? { _id: req.params.id }
    : { _id: req.params.id, manager: req.user._id };

  if (!(await Student.any(query))) {
    res.status(400);
    throw new Error(C.getResourse404Error("Student", req.params.id));
  }

  const result = await Student.updateOne(query, {
    $pull: { pickupLocations: { _id: req.body.id } },
  });

  res.status(200).json({ msg: result });
});

module.exports = {
  getUsers,
  getUser,
  requiredDataUser,
  createUser,
  updateUser,
  deleteUser,

  getSchools,
  getSchool,
  addSchool,
  updateSchool,
  deleteSchool,
  bulkOpsSchool,

  getBusStops,
  getBusStop,
  addBusStop,
  updateBusStop,
  deleteBusStop,

  getBuses,
  getBus,
  addBus,
  updateBus,
  deleteBus,
  bulkOpsBus,

  getStudents,
  getStudent,
  addStudent,
  updateStudent,
  deleteStudent,
  bulkOpsStudent,
  addPickupLocation,
  removePickupLocation,
};
