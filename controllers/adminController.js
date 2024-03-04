const fs = require("node:fs");
const path = require("node:path");
const asyncHandler = require("express-async-handler");
const C = require("../constants");
const UC = require("../utils/common");
const School = require("../models/schoolModel");
const User = require("../models/userModel");
const Bus = require("../models/busModel");
const Student = require("../models/studentModel");

/** 1. User */

// @desc    Get Users
// @route   POST /api/admin/user
// @access  Private
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "email";
  const searchField = req.query.sf;
  const searchValue = req.query.sv;

  const query =
    req.user.type === C.SUPERADMIN ? {} : { createdBy: req.user._id };

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

  const results = await UC.paginatedQuery(User, query, {}, page, limit, sort, [
    "createdBy",
    "email",
  ]);

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json({ success: true, ...results });
});

// @desc    Create a User
// @route   POST /api/admin/user
// @access  Private
const createUser = asyncHandler(async (req, res) => {
  const { email, password, name, mobile } = req.body;
  let type = req.body.type;

  if (req.user.type === C.ADMIN) {
    if ([C.SUPERADMIN, C.ADMIN].includes(type)) {
      res.status(400);
      throw new Error("type can only be manager, parent or student");
    }
  }

  const user = await User.create({
    email,
    password,
    name,
    mobile,
    type,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, msg: user._id });
});

/** 2. School */

// @desc    Get all schools
// @route   GET /api/admin/school
// @access  Private
const getSchools = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const searchField = req.query.sf;
  const searchValue = req.query.sv;

  const query = {};

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
    {},
    page,
    limit,
    sort,
    ["manager createdBy", "email"]
  );

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json({ success: true, ...results });
});

// @desc    Get a school
// @route   GET /api/admin/school/:id
// @access  Private
const getSchool = asyncHandler(async (req, res) => {
  const school = await School.findOne({ _id: req.params.id })
    .populate("manager createdBy", "email")
    .lean();

  if (!school) {
    res.status(404);
    throw new Error(C.getResourse404Error("School", req.params.id));
  }

  res.status(200).json({ success: true, msg: school });
});

// @desc    Add a school
// @route   POST /api/admin/school
// @access  Private
const addSchool = asyncHandler(async (req, res) => {
  if (!(await User.any({ _id: req.body.manager }))) {
    res.status(400);
    throw new Error(C.getResourse404Error("User", req.body.manager));
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
    manager: req.body.manager,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, msg: school._id });
});

// @desc    Update a school
// @route   PUT /api/admin/school/:id
// @access  Private
const updateSchool = asyncHandler(async (req, res) => {
  if (!(await School.any({ _id: req.params.id }))) {
    res.status(400);
    throw new Error(C.getResourse404Error("School", req.params.id));
  }

  if (req.body.manager) {
    if (!(await User.any({ _id: req.body.manager }))) {
      res.status(400);
      throw new Error(C.getResourse404Error("User", req.body.manager));
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
        manager: req.body.manager,
      },
    }
  );

  res.status(200).json({ success: true, msg: result });
});

// @desc    Delete a school
// @route   DELETE /api/admin/school/:id
// @access  Private
const deleteSchool = asyncHandler(async (req, res) => {
  const result = await School.deleteOne({ _id: req.params.id });

  if (result.deletedCount === 0) {
    res.status(400);
    throw new Error(C.getResourse404Error("School", req.params.id));
  }

  res.status(200).json({ success: true, msg: result });
});

// @desc    Bulk operations for school
// @route   POST /api/admin/school/bulk
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

    return res.status(200).json({ success: true, msg: result.msg });
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

    return res.status(200).json({ success: true, msg: result });
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

/** 3. Bus */

// @desc    Get all buses
// @route   GET /api/admin/bus
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

  res.status(200).json({ success: true, ...results });
});

// @desc    Get a bus
// @route   GET /api/admin/bus/:id
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

  res.status(200).json({ success: true, mnsg: bus });
});

// @desc    Add a bus
// @route   POST /api/admin/bus
// @access  Private
const addBus = asyncHandler(async (req, res) => {
  const manager = [C.SUPERADMIN, C.ADMIN].includes(req.user.type)
    ? req.body.manager
    : req.user._id;

  const bus = await Bus.create({
    name: req.body.name,
    device: req.body.device,
    manager,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, msg: bus._id });
});

// @desc    Update a bus
// @route   PUT /api/admin/bus/:id
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

  res.status(200).json({ success: true, msg: result });
});

// @desc    Delete a bus
// @route   DELETE /api/admin/bus/:id
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

  res.status(200).json({ success: true, msg: result });
});

// @desc    Bulk operations for bus
// @route   POST /api/admin/bus/bulk
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

    return res.status(200).json({ success: true, msg: result.msg });
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

    return res.status(200).json({ success: true, ...result });
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

/** 4. Student */

// @desc    Get all students
// @route   GET /api/admin/student
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

  res.status(200).json({ success: true, ...results });
});

// @desc    Get a student
// @route   GET /api/admin/student/:id
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

  res.status(200).json({ success: true, msg: student });
});

// @desc    Add a student
// @route   POST /api/admin/student
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

  res.status(201).json({ success: true, msg: student._id });
});

// @desc    Update a student
// @route   PUT /api/admin/student/:id
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

  res.status(200).json({ success: true, msg: result });
});

// @desc    Delete a student
// @route   DELETE /api/admin/student/:id
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

  res.status(200).json({ success: true, msg: result });
});

// @desc    Bulk operations for student
// @route   POST /api/admin/student/bulk
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

    return res.status(200).json({ success: true, msg: result.msg });
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

    return res.status(200).json({ success: true, msg: result });
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
// @route   POST /api/admin/student/pik-loc/:id
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

  res.status(200).json({ success: true, msg: result });
});

// @desc    Add pickup locations for student
// @route   DELETE /api/admin/student/pik-loc/:id
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

  res.status(200).json({ success: true, msg: result });
});

module.exports = {
  getUsers,
  createUser,

  getSchools,
  getSchool,
  addSchool,
  updateSchool,
  deleteSchool,
  bulkOpsSchool,

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
