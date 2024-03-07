const fs = require("node:fs");
const path = require("node:path");
const xlsx = require("xlsx");

const C = require("../constants");
const School = require("../models/schoolModel");
const Bus = require("../models/busModel");
const Student = require("../models/studentModel");

const createSearchQuery = (fields, value) => {
  const query = { $or: [] };

  for (const field of fields) {
    query.$or.push({
      ["$expr"]: {
        $regexMatch: {
          input: { $toString: `$${field}` },
          regex: new RegExp(value, "i"),
        },
      },
    });
  }

  return query;
};

const paginatedQuery = async (
  Model,
  query,
  select,
  page,
  limit,
  sort,
  populate = ["", ""]
) => {
  const total = await Model.countDocuments(query);
  const pages = Math.ceil(total / limit) || 1;
  if (page > pages) return false;
  const startIdx = (page - 1) * limit;
  const results = { total: total, pages, page, result: [] };

  results.result = await Model.find(query)
    .select(select)
    .skip(startIdx)
    .limit(limit)
    .populate(populate[0], populate[1])
    .sort(sort)
    .lean();

  return results;
};

const excelToJson = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  return data;
};

/**
 * School Functions
 */

const addMultipleSchools = async (userId, fileData) => {
  const schools = [];

  for (let i = 0; i < fileData.length; i++) {
    const school = fileData[i];
    const errors = [];

    if (!school.name) errors.push(C.getFieldIsReqAtIdx("name", i));
    if (!school.email) errors.push(C.getFieldIsReqAtIdx("email", i));
    if (!school.phone) errors.push(C.getFieldIsReqAtIdx("phone", i));
    if (!school.address) errors.push(C.getFieldIsReqAtIdx("address", i));
    if (!school.country) errors.push(C.getFieldIsReqAtIdx("country", i));
    if (!school.state) errors.push(C.getFieldIsReqAtIdx("state", i));
    if (!school.city) errors.push(C.getFieldIsReqAtIdx("city", i));
    if (!school.pincode) errors.push(C.getFieldIsReqAtIdx("pincode", i));
    if (!school.lat) errors.push(C.getFieldIsReqAtIdx("lat", i));
    if (!school.lon) errors.push(C.getFieldIsReqAtIdx("lon", i));
    if (!school.radius) errors.push(C.getFieldIsReqAtIdx("radius", i));

    if (errors.length > 0) {
      return {
        status: 400,
        errors,
      };
    }

    schools.push({ ...school, createdBy: userId });
  }

  const result = await School.create(schools);

  return {
    msg: `${result.length} schools successfully added.`,
  };
};

/**
 * School Functions
 */

/**
 * Student Functions
 */

const addMultipleStudents = async (userId, userType, fileData) => {
  const students = [];

  const errors = [];
  const admNoObj = {};
  const rfidObj = {};

  for (let i = 0; i < fileData.length; i++) {
    const row = fileData[i];

    if (!row.fname) errors.push(C.getFieldIsReqAtIdx("fname", i));
    if (!row.lname) errors.push(C.getFieldIsReqAtIdx("lname", i));

    const name = {
      f: row.fname,
      m: row.mname,
      l: row.lname,
    };

    if (!row.phone) errors.push(C.getFieldIsReqAtIdx("phone", i));
    if (!row.email) errors.push(C.getFieldIsReqAtIdx("email", i));

    if (!row.admissionNo) errors.push(C.getFieldIsReqAtIdx("admissionNo", i));
    // Store counts to check for duplication
    const admNo = row.admissionNo.toUpperCase();
    if (!admNoObj[admNo]) admNoObj[admNo] = 1;
    else admNoObj[admNo] += 1;

    if (!row.rfid) errors.push(C.getFieldIsReqAtIdx("rfid", i));
    // Store counts to check for duplication
    const rfid = row.rfid.toUpperCase();
    if (!rfidObj[rfid]) rfidObj[rfid] = 1;
    else rfidObj[rfid] += 1;

    if (!row.doa) errors.push(C.getFieldIsReqAtIdx("doa", i));
    if (isNaN(new Date(row.doa))) {
      errors.push(C.getFieldIsInvalidAtIdx("doa", i));
    }

    row.doa = new Date(row.doa + "T00:00:00Z");

    if (!row.dob) errors.push(C.getFieldIsReqAtIdx("dob", i));
    if (isNaN(new Date(row.dob))) {
      errors.push(C.getFieldIsInvalidAtIdx("dob", i));
    }

    row.dob = new Date(row.dob + "T00:00:00Z");

    if (!row.gender) errors.push(C.getFieldIsReqAtIdx("gender", i));
    if (!["m", "f", "o"].includes(row.gender)) {
      errors.push(C.getValueNotSupAtIdx(row.gender, i));
    }

    if (!row.school) errors.push(C.getFieldIsReqAtIdx("school", i));

    const school = await School.findOne({
      _id: row.school,
      createdBy: userId,
    })
      .select("_id")
      .lean();

    if (!school) errors.push(C.getResourse404Error("school", row.school));

    if (!row.bus) errors.push(C.getFieldIsReqAtIdx("bus", i));

    const bus = await Bus.findOne({
      _id: row.bus,
      createdBy: userId,
    })
      .select("_id")
      .lean();

    if (!bus) errors.push(C.getResourse404Error("bus", row.bus));

    if (!row.address) errors.push(C.getFieldIsReqAtIdx("address", i));
    if (!row.lat) errors.push(C.getFieldIsReqAtIdx("lat", i));
    if (!row.lon) errors.push(C.getFieldIsReqAtIdx("lon", i));
    if (!row.radius) errors.push(C.getFieldIsReqAtIdx("radius", i));

    const pickupLocation = {
      address: row.address,
      lat: row.lat,
      lon: row.lon,
      radius: row.radius,
    };

    const manager = [C.SUPERADMIN, C.ADMIN].includes(userType)
      ? row.manager
      : userId;

    if (!manager) errors.push(C.getFieldIsReqAtIdx("manager", i));

    students.push({
      name,
      phone: row.phone,
      email: row.email,
      rfid: row.rfid,
      admissionNo: row.admissionNo,
      doa: row.doa,
      dob: row.dob,
      gender: row.gender,
      school: row.school,
      bus: row.bus,
      pickupLocations: [pickupLocation],
      manager,
      createdBy: userId,
    });
  }

  for (const key of Object.keys(admNoObj)) {
    if (admNoObj[key] > 1) {
      errors.push(`Duplicate Values: admissionNo [${key}]`);
    }
  }

  for (const key of Object.keys(rfidObj)) {
    if (rfidObj[key] > 1) {
      errors.push(`Duplicate Values: admissionNo [${key}]`);
    }
  }

  if (errors.length > 0) {
    return {
      status: 400,
      errors,
    };
  }

  const result = await Student.create(students);

  return {
    msg: `${result.length} students successfully added.`,
  };
};

const getStudentName = (name) => {
  let studentName = name.f;
  studentName += name.m ? ` ${name.m} ` : " ";
  studentName += name.l;

  return studentName;
};

/**
 * Student Functions
 */

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

const rad2deg = (rad) => {
  return rad * (180 / Math.PI);
};

const getAngle = (lat1, lng1, lat2, lng2) => {
  const dLng = deg2rad(lng2) - deg2rad(lng1);
  const y = Math.sin(dLng) * Math.cos(deg2rad(lat2));
  const x =
    Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
    Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLng);
  const angle = (rad2deg(Math.atan2(y, x)) + 360) % 360;

  return Math.floor(angle);
};

const getLenBtwPointsInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const isPointInCircle = (lat1, lon1, lat2, lon2, radius) => {
  const distance = getLenBtwPointsInKm(lat1, lon1, lat2, lon2) * 1000;
  return distance <= radius;
};

const isPointInPolygon = (vertices, lat, lng) => {
  const polyLng = vertices.map((vertex) => vertex.lng);
  const polyLat = vertices.map((vertex) => vertex.lat);

  // vertices = vertices.split(",");
  // vertices = vertices.map((vertex) => parseFloat(vertex));

  // check for all X and Y
  // if (vertices.length % 2 !== 0) vertices.pop();

  let polyVertices = polyLat.length;
  // let i = 0;

  // while (i < vertices.length) {
  //   polyLat.push(vertices[i]);
  //   polyLng.push(vertices[i + 1]);

  //   i += 2;
  //   polyVertices++;
  // }

  let j = polyVertices - 1;
  let oddNodes = false;

  for (let i = 0; i < polyVertices; i++) {
    if (
      (polyLat[i] < lat && polyLat[j] >= lat) ||
      (polyLat[j] < lat && polyLat[i] >= lat)
    ) {
      if (
        polyLng[i] +
          ((lat - polyLat[i]) / (polyLat[j] - polyLat[i])) *
            (polyLng[j] - polyLng[i]) <
        lng
      ) {
        oddNodes = !oddNodes;
      }
    }
    j = i;
  }

  return oddNodes;
};

const getAppRootDir = (currentDir) => {
  while (!fs.existsSync(path.join(currentDir, "package.json"))) {
    currentDir = path.join(currentDir, "..");
  }
  return currentDir;
};

const writeLog = (name, data) => {
  const now = new Date();
  const date = new Date().getUTCDate();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0"); // months from 1-12
  const year = now.getUTCFullYear();

  const logDir = path.join(getAppRootDir(__dirname), "logs", name);

  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const logFile = path.join(logDir, `${name}_${year}-${month}-${date}.log`);

  let str = `[${new Date().toISOString().replace("T", " ").split(".")[0]}] `;

  str += "=> " + data + "\n";

  try {
    fs.appendFileSync(logFile, str);
  } catch (err) {
    console.log(err);
  }
};

const convUTCTo0530 = (date) => {
  let hours = 5,
    minutes = 30;

  const currDt = new Date(date);
  const currHours = currDt.getUTCHours();
  const currMin = currDt.getUTCMinutes();
  const currSec = currDt.getUTCSeconds();
  const currMSec = currDt.getUTCMilliseconds();

  const dt = new Date(
    currDt.setUTCHours(currHours + hours, currMin + minutes, currSec, currMSec)
  );

  const dtStr = dt.toISOString();

  hours = String(hours).padStart(2, "0");
  minutes = String(minutes).padStart(2, "0");

  return dtStr.replace("Z", `+${hours}:${minutes}`);
};

const formatDateToAMPM = (dateTime) => {
  const dt = new Date(dateTime);

  if (dt.getTime() === 0) return "NA";

  const Y = String(dt.getUTCFullYear()).padStart(2, "0");
  const M = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const D = String(dt.getUTCDate()).padStart(2, "0");
  const h_ = dt.getUTCHours();
  const h = String(h_ > 12 ? h_ - 12 : h_).padStart(2, "0");
  const m = String(dt.getUTCMinutes()).padStart(2, "0");
  const s = String(dt.getUTCSeconds()).padStart(2, "0");
  const postFix = h_ > 11 ? "PM" : "AM";

  return `${D}-${M}-${Y} ${h}:${m}:${s} ${postFix}`;
};

module.exports = {
  createSearchQuery,
  paginatedQuery,
  excelToJson,
  addMultipleSchools,

  addMultipleStudents,
  getStudentName,

  getAngle,
  getLenBtwPointsInKm,
  isPointInCircle,
  isPointInPolygon,
  writeLog,

  convUTCTo0530,
  formatDateToAMPM,
};
