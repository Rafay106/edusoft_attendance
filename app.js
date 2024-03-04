// require('@tensorflow/tfjs-node');
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyparser = require("body-parser");
const fs = require("fs");
const app = express();
var request = require("request");
const multer = require("multer");
var path = require("path");
const faceapi = require("face-api.js");
const { Canvas, Image } = require("canvas");
const sdk = require("api")("@onesignal/v9.0#9qqu7a46lli0f9a45");
const canvas = require("canvas");
const cron = require("node-cron");
const axios = require("axios");
const compression = require("compression");
const moment = require("moment");
const { log, paginatedQuery, createSearchQuery } = require("./utils/utilities");

faceapi.env.monkeyPatch({ Canvas, Image });
const port = 3000;
const secret = "THISISMYSECRETKEY";
const MAX_DEPTH = 5;

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); //Appending extension
  },
});

var upload = multer({ storage: storage });

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,OPTIONS,PUT,POST,PATCH,DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

app.set("view engine", "jade");
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "build")));
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(compression({ level: 9 }));
process.on("warning", (e) => console.warn(e.stack));

mongoose
  .connect("mongodb://127.0.0.1:27017/edusoft")
  .then((conn) => console.log(`mongodb connected: ${conn.connection.host}`))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  mobile: String,
  type: String,
});

const deviceSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  deviceID: { type: String, required: true },
  deviceName: { type: String, required: true },
  trackerTime: { type: Date },
  serverTime: { type: Date },
  latitude: { type: String, default: "0.0" },
  longitude: { type: String, default: "0.0" },
  speed: { type: String, default: "0" },
  angle: { type: String, default: "0" },
  status: { type: String, default: "Not Charging" },
  level: { type: String, default: "0" },
  gsm: { type: String },
});

const locationSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: { type: String, required: true },
  address: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  pincode: { type: String, required: true },
  userID: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
});

const busTrackSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  deviceID: {
    type: String,
    ref: "Device",
  },
  trackerTime: { type: Date },
  serverTime: { type: Date },
  accuracy: { type: String, default: "0.0" },
  latitude: { type: String, default: "0.0" },
  latitude: { type: String, default: "0.0" },
  latitude: { type: String, default: "0.0" },
  latitude: { type: String, default: "0.0" },
  longitude: { type: String, default: "0.0" },
  speed: { type: String, default: "0" },
  angle: { type: String, default: "0" },
  status: { type: String, default: "Not Charging" },
  level: { type: String, default: "0" },
  gsm: { type: String },
});

const companySchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: { type: String, required: true },
  location: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  userID: { type: String, required: true },
});

const departmentSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  company: { type: String, required: true },
  name: { type: String, required: true },
});

const designationSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  department: { type: String, required: true },
  name: { type: String, required: true },
});

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  joining: { type: Date, required: true },
  rfidID: { type: String, default: "" },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Route",
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Department",
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Designation",
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Parent",
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Bus",
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Device",
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  adhaarNo: { type: String },
  admissionNo: { type: String, required: true },
  gender: { type: String },
  birth: { type: String },
  photoUrl: { type: String },
  numbers: [Number],
});

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Employee",
  },
  type: { type: String },
  latitude: { type: String },
  longitude: { type: String },
  latitude2: { type: String },
  longitude2: { type: String },
  date: { type: Date },
  morning: {
    entry: {
      time: { type: Date },
      lat: { type: String },
      lon: { type: String },
    },
    exit: {
      time: { type: Date },
      lat: { type: String },
      lon: { type: String },
    },
  },
  afternoon: {
    entry: {
      time: { type: Date },
      lat: { type: String },
      lon: { type: String },
    },
    exit: {
      time: { type: Date },
      lat: { type: String },
      lon: { type: String },
    },
  },
  entryTime: { type: Date, index: true, unique: true, sparse: true },
  exitTime: { type: Date, index: true, unique: true, sparse: true },
  deviceID: { type: String, ref: "Device" },
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const attendanceEventSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  studentID: {
    type: String,
    ref: "Employee",
  },
  attendance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Attendance",
  },
  deviceID: {
    type: String,
  },
  type: {
    type: String,
  },
  status: {
    type: Number,
  },
  message: {
    type: String,
  },
  time: {
    type: Date,
    index: true,
    unique: true,
    sparse: true,
  },
});

const notificationEventSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
  },
  status: {
    type: Number,
  },
  message: {
    type: String,
  },
  time: {
    type: Date,
  },
  sendIDs: { type: String, default: "" },
  title: { type: String, default: "" },
});

const faceSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    unique: true,
  },
  descriptions: {
    type: Array,
    required: true,
  },
});

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const routeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const busSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Staff",
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Device",
  },
  route: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Route",
    },
  ],
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
  },
  replacement: {
    type: String,
  },
  replacementID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bus",
  },
  reason: {
    type: String,
  },
  notes: {
    type: String,
  },
});

const parentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
  children: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  ],
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

// const shiftSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   isFixed: { type: Boolean, required: true, default: true },
//   loginTime: { type: String, default: '09:00' },
//   logoutTime: { type: String, default: '17:00' },
//   duration: { type: Number, default: '08:00'},
//   username: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   employeeID: { type: String, required: true, unique: true },
//   post: { type: String, },
//   creator: { type: String, required: true, default: 'company' },
//   photoUrl: { type: String },
//   status: { type: String, required: true, default: 'out' },
//   time: { type: String },
//   lat: { type: Number },
//   lng: { type: Number },
//   battery: { type: Number },
//   charging: { type: String }
// });

const User = mongoose.model("User", userSchema);
const Location = mongoose.model("Location", locationSchema);
const Company = mongoose.model("Company", companySchema);
const Department = mongoose.model("Department", departmentSchema);
const Designation = mongoose.model("Designation", designationSchema);
const Employee = mongoose.model("Employee", employeeSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);
const FaceModel = mongoose.model("Face", faceSchema);
const Device = mongoose.model("Device", deviceSchema);
const Staff = mongoose.model("Staff", staffSchema);
const Bus = mongoose.model("Bus", busSchema);
const Parent = mongoose.model("Parent", parentSchema);
const Route = mongoose.model("Route", routeSchema);
const BusTrack = mongoose.model("BusTrack", busTrackSchema);
const AttendanceEvent = mongoose.model(
  "AttendanceEvent",
  attendanceEventSchema
);
const NotificationEvent = mongoose.model(
  "NotificationEvent",
  notificationEventSchema
);

cron.schedule(
  "0 23 * * *",
  async () => {
    console.log("Running a job at 23:00 at Asia/Kolkata timezone");
    var attendanceList = await Attendance.find({ type: "entry" }).exec();
    var type = "entry";

    // const attendanceEg = {
    //   _id: "6584f3689dfa5ae73eb512f8",
    //   employee: "65637d13ab006ee14f637bf1",
    //   type: "entry",
    //   entryTime: "2023-12-22T07:50:28.000Z",
    //   exitTime: "2023-12-22T07:50:28.000Z",
    //   deviceID: "8d1eb670b3caef9f",
    //   userID: "64bf66b2130f606ef124dcc5",
    // };

    for (let index = 0; index < attendanceList.length; index++) {
      const attendance = attendanceList[index];
      if (!attendance || attendance == null) continue;

      type = "exit";
      var differenceMs = new Date() - attendance.entryTime;
      var differenceMinutes = differenceMs / (1000 * 60);
      if (differenceMinutes > 2) {
        attendance.exitTime = new Date();
        attendance.latitude2 = "0.0";
        attendance.longitude2 = "0.0";
        attendance.type = "exit";

        try {
          await attendance.save();
        } catch (err) {
          return;
        }
      } else {
        // res.send('Attendance recorded successfully');
      }
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

cron.schedule("*/5 * * * * *", async () => {
  const result = await AttendanceEvent.find({ status: -1 })
    .populate({
      path: "studentID",
      populate: [
        { path: "route", model: "Route" },
        { path: "department", model: "Department" },
        { path: "designation", model: "Designation" },
        { path: "parent", model: "Parent" },
        { path: "bus", model: "Bus" },
        { path: "device", model: "Device" },
      ],
    })
    .exec();

  const eventEg = {
    _id: "65c2e1857feaca44590e0e35",
    userID: "64bf66b2130f606ef124dcc5",
    studentID: "65637d17ab006ee14f63818b",
    attendance: "65c2e1857feaca44590e0e33",
    deviceID: "c2d45f9d7fa6b275",
    type: "entry",
    status: -1,
    time: "2024-02-07T07:18:42.000Z",
  };

  // log("con-job2", JSON.stringify(result));

  for (let index = 0; index < result.length; index++) {
    const element = result[index];
    var initialTime = element.time;
    if (element.deviceID == element.studentID.device.deviceID) {
      try {
        const resultDevice = await Device.findOne({
          deviceID: element.deviceID,
        }).exec();
        const resultBus = await Bus.findOne({
          device: resultDevice._id,
        }).exec();
        const message = `Your child ${element.studentID.name} (${
          element.studentID.department.name
        } - ${
          element.studentID.designation.name
        }) has entered the school bus (${resultBus.name}) at ${initialTime
          .toUTCString()
          .replace(" GMT", "")}.`;
        var options = {
          method: "POST",
          url: "https://onesignal.com/api/v1/notifications",
          headers: {
            Authorization:
              "Basic NjYzZTAyOGQtMGQ4Yi00YWVlLTlmYTItZDRmYWJiNzc3ZTA4",
            // 'Authorization': 'Basic YjcxY2YxMmUtMTYzNi00ZmMxLTgxNGUtODFjOTUxZThjMzcx',
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            app_id: "54c50c51-596e-479b-92ec-14c48077409b",
            // "app_id": "64726b7f-6e76-45b9-8748-6bacbe8a5533",
            // "included_segments": [
            //   "Subscribed Users"
            // ],
            include_external_user_ids: [
              // element.studentID.parent._id,
              element.studentID._id,
              element._id,
              "63fa53d4dd45a01f493da24f",
              "64be2d8a020ed09512b25112",
              "64bf66b2130f606ef124dcc5",
              "64bfb47c76d84007d70db963",
            ],
            contents: {
              en: message,
            },
            name: "INTERNAL_CAMPAIGN_NAME",
          }),
        };
        request(options, async function (error, response) {
          if (error) throw new Error(error);
          await AttendanceEvent.findByIdAndUpdate(element.id, {
            status: 1,
            message,
          }).exec();
        });
      } catch (e) {
        console.log(e);
      }
    } else {
      try {
        const resultDevice = await Device.findOne({
          deviceID: element.deviceID,
        }).exec();
        if (!resultDevice) {
          log(
            "cron-job1 :",
            `element.deviceID (${element.deviceID}) not found!`
          );
          return;
        }

        const resultBus = await Bus.findOne({
          device: resultDevice._id,
        }).exec();
        const message = `Your child ${element.studentID.name} (${
          element.studentID.department.name
        } - ${
          element.studentID.designation.name
        }) has entered in a wrong school bus (${resultBus.name}) instead of ${
          element.studentID.device.deviceName
        } at ${initialTime.toUTCString().replace(" GMT", "")}.`;
        var options = {
          method: "POST",
          url: "https://onesignal.com/api/v1/notifications",
          headers: {
            Authorization:
              "Basic NjYzZTAyOGQtMGQ4Yi00YWVlLTlmYTItZDRmYWJiNzc3ZTA4",
            // 'Authorization': 'Basic YjcxY2YxMmUtMTYzNi00ZmMxLTgxNGUtODFjOTUxZThjMzcx',
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            app_id: "54c50c51-596e-479b-92ec-14c48077409b",
            // "app_id": "64726b7f-6e76-45b9-8748-6bacbe8a5533",
            // "included_segments": [
            //   "Subscribed Users"
            // ],
            include_external_user_ids: [
              // element.studentID.parent._id,
              element.studentID._id,
              element._id,
              "63fa53d4dd45a01f493da24f",
              "64be2d8a020ed09512b25112",
              "64bf66b2130f606ef124dcc5",
              "64bfb47c76d84007d70db963",
            ],
            contents: {
              en: message,
            },
            name: "INTERNAL_CAMPAIGN_NAME",
          }),
        };
        request(options, async function (error, response) {
          if (error) throw new Error(error);
          await AttendanceEvent.findByIdAndUpdate(element.id, {
            status: 1,
            message,
          }).exec();
        });
      } catch (e) {
        console.log(e);
      }
    }
  }
});

cron.schedule("* */1 * * * *", async () => {
  const result = await NotificationEvent.find({ status: -1 }).exec();
  for (let index = 0; index < result.length; index++) {
    const element = result[index];
    try {
      var options = {
        method: "POST",
        url: "https://onesignal.com/api/v1/notifications",
        headers: {
          Authorization:
            "Basic NjYzZTAyOGQtMGQ4Yi00YWVlLTlmYTItZDRmYWJiNzc3ZTA4",
          // 'Authorization': 'Basic YjcxY2YxMmUtMTYzNi00ZmMxLTgxNGUtODFjOTUxZThjMzcx',
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          app_id: "54c50c51-596e-479b-92ec-14c48077409b",
          // "app_id": "64726b7f-6e76-45b9-8748-6bacbe8a5533",
          include_external_user_ids: [
            "63fa53d4dd45a01f493da24f",
            "64be2d8a020ed09512b25112",
            "64bf66b2130f606ef124dcc5",
            "64bfb47c76d84007d70db963",
          ],
          contents: {
            en: element.message,
          },
          name: "INTERNAL_CAMPAIGN_NAME",
        }),
      };
      request(options, async function (error, response) {
        if (error) throw new Error(error);
        await NotificationEvent.findByIdAndUpdate(element.id, {
          status: 1,
        }).exec();
      });
    } catch (e) {
      console.log(e);
    }
  }
});

cron.schedule("* */30 * * * *", async () => {
  // Get the current time
  const currentTime = moment();

  // Get the current time's hour and minute
  const currentHour = currentTime.hour();
  const currentMinute = currentTime.minute();

  // Calculate the remaining time until 12 AM
  const remainingHours = 23 - currentHour;
  const remainingMinutes = 60 - currentMinute;

  // Check if there's less than 1 hour left until 12 AM
  if (remainingHours === 0 && remainingMinutes < 60) {
    const result = await Bus.find({ replacement: "true" }).exec();
    for (let index = 0; index < result.length; index++) {
      const element = result[index];
      await Bus.findByIdAndUpdate(element.id, { replacement: "false" }).exec();
    }
  }
});

const apiEndpoint = "https://www.speedotrack.in/func/fn_rilogbook_custom.php";

// Function to fetch and parse data
const fetchData = async () => {
  try {
    // Load data from the API endpoint
    const response = await axios.get(apiEndpoint, {
      params: {
        cmd: "load_rilogbook_list",
        drivers: true,
        passengers: true,
        trailers: true,
        rows: 10000,
        page: 1,
        sidx: "rilogbook_id",
        sord: "asc",
        rid: fs.readFileSync("lastElementId.txt", "utf-8") || 0,
      },
    });

    const data = response.data;
    if (data.rows) log("fetchData", JSON.stringify(data));

    for (const entry of data.rows) {
      // Extract RFID ID from cell index 2
      try {
        const rfidID = entry.cell[2];
        const deviceName = entry.cell[1];
        // Find employee in the Employee collection based on RFID ID
        const employee = await Employee.findOne({ rfidID });
        const device = await Device.findOne({ deviceName });

        if (!employee || !device) return;

        const employeeId = employee._id;
        let givenDate = new Date(entry.cell[0]);

        // Adding 5 hours and 30 minutes
        // givenDate.setHours(givenDate.getHours() + 5);
        // givenDate.setMinutes(givenDate.getMinutes() + 30);
        const timestamp = givenDate;
        const deviceID = device.deviceID;
        const userID = "64bf66b2130f606ef124dcc5";
        if (!employeeId) return;

        const now = new Date();
        const today = new Date(new Date().setUTCHours(0, 0, 0, 0));

        const isMorning = now.getUTCHours() < 10 ? true : false;
        const isAfternoon = !isMorning && now.getUTCHours() < 18 ? true : false;

        // Find out attendance location
        const department = await Department.findById(employee.department)
          .select("company")
          .lean();

        const company = await Company.findById(department.company)
          .select("location")
          .lean();

        const location = await Location.findById(company.location).select(
          "latitude longitude"
        );

        const attendance = await Attendance.findOne({
          employee: employeeId,
          date: today,
          // type: "entry",
        });

        if (!attendance) {
          const differenceMs = timestamp - latestEntry.exitTime;
          const differenceMinutes = differenceMs / (1000 * 60);

          if (differenceMinutes <= 2) return;

          const attendance = {
            employee: employeeId,
            date: today,
            deviceID,
            userID,
          };
          if (isMorning) {
            attendance.morning = {};
          }
          if (isAfternoon) {
          }

          let storeAttendance = Attendance.create({
            type,
            deviceID: deviceID,
            userID,
            entryTime: timestamp,
            exitTime: timestamp,
          });
        }

        try {
          var type = "entry";

          if (!attendance || attendance == null) {
            await storeAttendance.save(async (err) => {
              if (err) {
                return;
              }
              notification = new AttendanceEvent({
                studentID: employeeId,
                type: type,
                userID,
                deviceID: deviceID,
                status: -1,
                time: timestamp,
              });
              await notification.save((err) => {
                if (err) {
                  return;
                }
              });
            });
          } else {
            type = "exit";
            var differenceMs = timestamp - attendance.entryTime;
            var differenceMinutes = differenceMs / (1000 * 60);
            if (differenceMinutes > 2) {
              attendance.exitTime = timestamp;
              attendance.type = "exit";
              await attendance.save(async (err) => {
                if (err) {
                  res.status(500).send("Error saving attendance record");
                  return;
                }
                notification = new AttendanceEvent({
                  studentID: employeeId,
                  type: type,
                  userID,
                  deviceID: deviceID,
                  status: -1,
                  time: timestamp,
                });
                await notification.save((err) => {
                  if (err) {
                    res.status(500).send("Error saving attendance record");
                    return;
                  }
                });
              });
            } else {
            }
          }
        } catch (e) {}
      } catch (error) {
        console.log(error);
        log(
          "fetchData",
          `Error: ${error.message} | Stack: ${JSON.stringify(error.stack)}`
        );
      }
    }

    // Extract the last element's ID
    const lastElementId = data.rows[data.rows.length - 1].id;

    // Save the ID to a file
    fs.writeFileSync("lastElementId.txt", lastElementId, "utf-8");
  } catch (error) {}
};

// Define your cron schedule (runs every 5 minutes)
cron.schedule("*/5 * * * * *", () => {
  fetchData();
});

// cron.schedule('*/10 * * * * *', async () => {
//   const result = await AttendanceEvent.find({ status: -1 }).populate('studentID').exec();
//   console.log(result);
//   for (let index = 0; index < result.length; index++) {
//     const element = result[index];
//     var initialTime = element.time;

//     initialTime.setHours(initialTime.getHours() + 5);
//     initialTime.setMinutes(initialTime.getMinutes() + 30);
//     var options = {
//       'method': 'POST',
//       'url': 'https://onesignal.com/api/v1/notifications',
//       'headers': {
//         'Authorization': 'Basic YjcxY2YxMmUtMTYzNi00ZmMxLTgxNGUtODFjOTUxZThjMzcx',
//         'accept': 'application/json',
//         'content-type': 'application/json',
//       },
//       body: JSON.stringify({
//         "app_id": "64726b7f-6e76-45b9-8748-6bacbe8a5533",
//         // "included_segments": [
//         //   "Subscribed Users"
//         // ],
//         "include_external_user_ids": [
//           element.studentID.parent,
//           element._id,
//         ],
//         "contents": {
//           "en": `Your child ${element.studentID.name} has ${element.type == 'entry' ? 'entered' : 'exited'} the school bus at ${initialTime.toLocaleString()}.`,
//         },
//         "name": "INTERNAL_CAMPAIGN_NAME"
//       })
//     };
//     request(options, async function (error, response) {
//       if (error) throw new Error(error);
//       await AttendanceEvent.findByIdAndUpdate(element.id, { status: 1 }).exec();
//     });
//   }
// });

const addHoursAndMinutes = (date, hours, minutes) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

// Function to fetch and parse data from the endpoint
const fetchDataBus = async () => {
  try {
    const response = await axios.get(
      "https://www.speedotrack.in/api/api.php?api=user&ver=1.0&key=6DBC43AC16B9126419E52DEA3753EB30&cmd=OBJECT_GET_LOCATIONS,*"
    );
    const data = response.data;
    log("fetchDataBus", JSON.stringify(data));

    // Process and update each data entry in the database
    for (const objectId in data) {
      const objectData = data[objectId];

      // Update the device in the database based on the 'name' key
      const updatedDevice = await Device.findOneAndUpdate(
        { deviceName: objectData.name },
        {
          $set: {
            // trackerTime: addHoursAndMinutes(new Date(objectData.dt_tracker), 6, 30),
            // serverTime: addHoursAndMinutes(new Date(objectData.dt_server), 6, 30),
            trackerTime: new Date(objectData.dt_tracker),
            serverTime: new Date(objectData.dt_server),
            latitude: objectData.lat,
            longitude: objectData.lng,
            speed: objectData.speed,
            angle: objectData.angle,
          },
        },
        { new: true }
      );

      if (updatedDevice) {
      } else {
      }
    }
  } catch (error) {
    console.error("Error fetching and updating data:", error.message);
  }
};

// Schedule the cron job to run every 10 seconds
cron.schedule("*/10 * * * * *", () => {
  fetchDataBus();
});

async function LoadModels() {
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/models");
}

LoadModels();

async function uploadLabeledImages(images, label) {
  try {
    const descriptions = [];
    // Loop through the images
    for (let i = 0; i < images.length; i++) {
      const img = await canvas.loadImage(images[i]);
      // Read each face and save the face descriptions in the descriptions array
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      descriptions.push(detections.descriptor);
    }
    const createFace = new FaceModel({
      label: label,
      descriptions: descriptions,
    });
    await createFace.save();
    return true;
  } catch (error) {
    return error;
  }
}

async function getDescriptorsFromDB(image) {
  let faces = await FaceModel.find();
  for (i = 0; i < faces.length; i++) {
    for (j = 0; j < faces[i].descriptions.length; j++) {
      faces[i].descriptions[j] = new Float32Array(
        Object.values(faces[i].descriptions[j])
      );
    }
    faces[i] = new faceapi.LabeledFaceDescriptors(
      faces[i].label,
      faces[i].descriptions
    );
  }
  const faceMatcher = new faceapi.FaceMatcher(faces, 0.6);

  const img = await canvas.loadImage(image);
  let temp = faceapi.createCanvasFromMedia(img);
  // Process the image for the model
  const displaySize = { width: img.width, height: img.height };
  faceapi.matchDimensions(temp, displaySize);

  // Find matching faces
  const detections = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptors();
  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  const results = resizedDetections.map((d) =>
    faceMatcher.findBestMatch(d.descriptor)
  );
  return results;
}

// Create a new staff member
app.post("/post-staff", (req, res) => {
  const { name, email, phone, address, userID } = req.body;
  const staffMember = new Staff({ name, email, phone, address, userID });

  staffMember
    .save()
    .then((result) => {
      res.status(201).json(result);
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while creating the staff member." });
    });
});

// Get all staff members
app.get("/all-staff/:id", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const searchField = req.query["search-field"];
  const searchValue = req.query["search-value"];

  const query = { userID: req.params.id };

  if (searchField && searchValue) {
    if (searchField === "all") {
      const fields = ["name", "email", "phone", "address"];

      const searchQuery = createSearchQuery(fields, searchValue);
      query["$or"] = searchQuery["$or"];
    } else {
      const searchQuery = createSearchQuery([searchField], searchValue);
      query["$or"] = searchQuery["$or"];
    }
  }

  const results = await paginatedQuery(Staff, query, {}, page, limit, sort);

  if (!results) {
    return res.status(200).json({ msg: "Page limit exceeded!" });
  }

  res.status(200).json(results.result);
});

// Get a specific staff member by ID
app.get("/staff/:id", (req, res) => {
  const { id } = req.params;
  Staff.findById(id)
    .then((staffMember) => {
      if (staffMember) {
        res.json(staffMember);
      } else {
        res.status(404).json({ error: "Staff member not found." });
      }
    })
    .catch((error) => {
      res.status(500).json({
        error: "An error occurred while retrieving the staff member.",
      });
    });
});

// Update a specific staff member by ID
app.patch("/modify-staff/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address } = req.body;

  Staff.findByIdAndUpdate(id, { name, email, phone, address }, { new: true })
    .then((staffMember) => {
      if (staffMember) {
        res.json(staffMember);
      } else {
        res.status(404).json({ error: "Staff member not found." });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while updating the staff member." });
    });
});

// Delete a specific staff member by ID
app.delete("/delete-staff/:id", (req, res) => {
  const { id } = req.params;
  Staff.findByIdAndDelete(id)
    .then((staffMember) => {
      if (staffMember) {
        res.json({ message: "Staff member deleted successfully." });
      } else {
        res.status(404).json({ error: "Staff member not found." });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while deleting the staff member." });
    });
});

app.post("/post-face", upload.single("photo"), async (req, res) => {
  const label = req.body.label;
  const File1 = req.file ? req.file.path : "";
  let result = await uploadLabeledImages([File1], label);
  if (result) {
    res.json({ message: "Face data stored successfully" });
  } else {
    res.json({ message: "Something went wrong, please try again." });
  }
});

app.post("/check-face", upload.single("photo"), async (req, res) => {
  const File1 = req.file ? req.file.path : "";
  let result = await getDescriptorsFromDB(File1);
  res.json({ result });
});

// Implement registration
app.post("/register", async (req, res) => {
  const { email, password, name, mobile, type } = req.body;
  // Check if user already exists
  const user = await User.findOne({ email });
  if (user) {
    return res
      .status(409)
      .json({ message: "Email already taken", success: false });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    email,
    password: hashedPassword,
    mobile: mobile,
    name: name,
    type,
  });
  await newUser.save();
  res.status(201).json({ message: "User created", success: true });
});

app.get("/send-push", async (req, res) => {
  const result = await AttendanceEvent.find({ status: -1 })
    .populate("studentID")
    .exec();
  for (let index = 0; index < result.length; index++) {
    const element = result[index];
    var options = {
      method: "POST",
      url: "https://onesignal.com/api/v1/notifications",
      headers: {
        Authorization: "Basic YjcxY2YxMmUtMTYzNi00ZmMxLTgxNGUtODFjOTUxZThjMzcx",
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        app_id: "64726b7f-6e76-45b9-8748-6bacbe8a5533",
        included_segments: ["Subscribed Users"],
        contents: {
          en: `Your child ${element.studentID.name} has ${
            element.type == "entry" ? "entered" : "exited"
          } the school bus at ${element.time
            .toUTCString()
            .replace(" GMT", "")}.`,
        },
        name: "INTERNAL_CAMPAIGN_NAME",
      }),
    };
    await request(options, async function (error, response) {
      if (error) throw new Error(error);
      await AttendanceEvent.findByIdAndUpdate(element.id, { status: 1 }).exec();
    });
  }
});

// Implement login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(401)
      .json({ message: "Invalid email or password", success: false });
  }
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res
      .status(401)
      .json({ message: "Invalid email or password", success: false });
  }
  const token = jwt.sign({ email: user.email }, secret, { expiresIn: "1h" });
  if (email == "prasunranjan54@gmail.com") {
    res.status(200).json({
      message: "Logged in successfully",
      token,
      success: true,
      type: "admin",
    });
  } else {
    res.status(200).json({
      message: "Logged in successfully",
      token,
      success: true,
      type: "office",
    });
  }
});

app.post("/mobile/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(401)
      .json({ message: "Invalid email or password", success: false });
  }
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res
      .status(401)
      .json({ message: "Invalid email or password", success: false, user });
  }
  const token = jwt.sign({ email: user.email }, secret, { expiresIn: "1h" });
  res.status(200).json({
    message: "Logged in successfully",
    token,
    success: true,
    type: "admin",
    user: user,
  });
});

// POST route for creating a new location
app.post("/post-locations", authenticateToken, (req, res) => {
  const {
    name,
    address,
    country,
    state,
    city,
    pincode,
    latitude,
    longitude,
    userID,
  } = req.body;
  if (
    !name ||
    !address ||
    !country ||
    !state ||
    !city ||
    !pincode ||
    !latitude ||
    !longitude
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const location = new Location({
    name,
    address,
    country,
    state,
    city,
    pincode,
    latitude,
    longitude,
    userID,
  });
  location
    .save()
    .then((savedLocation) => res.status(201).json(savedLocation))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/get-locations/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const locations = await Location.find({ userID: id });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/modify-locations/:id", authenticateToken, async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/delete-locations/:id", authenticateToken, async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/post-company", authenticateToken, (req, res) => {
  const { name, location, email, phone, userID } = req.body;
  if (!name || !location || !email || !phone) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const company = new Company({ name, location, email, phone, userID });
  company
    .save()
    .then((savedCompany) => res.status(201).json(savedCompany))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/get-company/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const company = await Company.find({ userID: id });
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/modify-company/:id", authenticateToken, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/delete-company/:id", authenticateToken, async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/post-device", authenticateToken, (req, res) => {
  const { deviceID, deviceName, userID } = req.body;

  if (!deviceID || !deviceName) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const device = new Device({ deviceID, deviceName, userID });
  device
    .save()
    .then((savedDevice) => res.status(201).json(savedDevice))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/get-devices/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const devices = await Device.find({ userID: id });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/modify-device/:id", authenticateToken, async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(device);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/delete-device/:id", authenticateToken, async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    res.json(device);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/mobile/change-password", async (req, res) => {
  try {
    const { id, currentPassword, newPassword } = req.body;
    const user = await User.findById(id);
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!passwordMatches) {
      return res
        .status(401)
        .json({ message: "Incorrect current password", success: false });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(id, { password: hashedNewPassword });
    return res
      .status(200)
      .json({ message: "Password changed successfully", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
});

app.put("/mobile/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile } = req.body;
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found", success: false });
  }
  user.name = name || user.name;
  user.email = email || user.email;
  user.mobile = mobile || user.mobile;
  try {
    const updatedUser = await user.save();
    res.status(200).json({
      message: "User information successfully",
      success: true,
      updatedUser,
    });
  } catch (err) {
    res.status(400).json({ message: err.message, success: false });
  }
});

app.post("/post-department", async (req, res) => {
  const department = new Department({
    company: req.body.company,
    name: req.body.name,
    userID: req.body.userID,
  });
  await department
    .save()
    .then((savedCompany) => res.status(201).json(savedCompany))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/get-departments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const department = await Department.find({ userID: id });
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/modify-department/:id", authenticateToken, async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/delete-department/:id", authenticateToken, async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/post-designation", async (req, res) => {
  const designation = new Designation({
    department: req.body.department,
    name: req.body.name,
    userID: req.body.userID,
  });
  await designation
    .save()
    .then((savedCompany) => res.status(201).json(savedCompany))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/get-designation/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const designation = await Designation.find({ userID: id });
    res.json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/modify-designation/:id", authenticateToken, async (req, res) => {
  try {
    const designation = await Designation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/delete-designation/:id", authenticateToken, async (req, res) => {
  try {
    const designation = await Designation.findByIdAndDelete(req.params.id);
    res.json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/post-employees", upload.single("photo"), async (req, res) => {
  try {
    const {
      userID,
      name,
      phone,
      email,
      joining,
      route,
      department,
      designation,
      parent,
      bus,
      device,
      adhaarNo,
      admissionNo,
      birth,
      gender,
    } = req.body;

    // Validate required data
    if (
      !userID ||
      !name ||
      !phone ||
      !email ||
      !joining ||
      !birth ||
      !gender ||
      !department ||
      !designation
    ) {
      return res.status(400).json({ error: "Required data missing." });
    }

    const employee = new Employee({
      userID,
      name,
      phone,
      email,
      joining: new Date(joining),
      route,
      parent,
      bus,
      device,
      department,
      designation,
      adhaarNo,
      admissionNo,
      gender,
      birth: new Date(birth),
      photoUrl: req.file ? req.file.path : "",
    });

    const savedEmployee = await employee.save();

    const storeAttendance = new Attendance({
      userID,
      type: "exit",
      employee: savedEmployee._id,
      deviceID: "registered",
      entryTime: new Date(joining),
      exitTime: new Date(joining),
    });

    await storeAttendance.save();

    return res.status(201).json(savedEmployee);
  } catch (err) {
    return res.status(500).json({ error: "Error saving employee record." });
  }
});

app.post("/employees/:id/updateNumbers", async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { numbers } = req.body;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    employee.numbers = JSON.parse(numbers);
    await employee.save();

    return res.status(200).json({ message: "Numbers updated successfully" });
  } catch (error) {
    console.error("Error updating numbers:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

function shuffleArray(array) {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
}

app.get("/invalid-photo/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const employees = await Employee.find({ userID: id })
      .populate(["department", "designation", "bus"])
      .lean()
      .select([
        "name",
        "phone",
        "department",
        "designation",
        "bus",
        "admissionNo",
        "photoUrl",
      ]);
    const noImage = [];
    var i = 0;
    for (let index = 0; index < employees.length; index++) {
      var element = employees[index];
      element.department = element.department ? element.department.name : "";
      element.designation = element.designation ? element.designation.name : "";
      element.bus = element.bus ? element.bus.name : "";
      await axios
        .head("http://attendance.edusoft.in/" + element.photoUrl)
        .then((response) => {})
        .catch((error) => {
          if (error.response && error.response.status === 404) {
            noImage.push(element);
          } else {
            console.error("An error occurred:", error.message);
          }
        });
    }
    res.json(noImage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/get-employees/:id", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const searchField = req.query["search-field"];
  const searchValue = req.query["search-value"];

  const id = req.params.id;

  const query = {};

  if (searchField && searchValue) {
    if (searchField === "all") {
      const fields = ["name", "email", "phone", "address"];

      const searchQuery = createSearchQuery(fields, searchValue);
      query["$or"] = searchQuery["$or"];
    } else {
      const searchQuery = createSearchQuery([searchField], searchValue);
      query["$or"] = searchQuery["$or"];
    }
  }

  try {
    if (id == "D-53") {
      const uploadsFolderPath = path.join(__dirname, "uploads");
      fs.readdir(uploadsFolderPath, async (err, files) => {
        if (err) {
          console.error("Error reading directory:", err);
          return;
        }
        const tempList = [];
        for (let index = 0; index < files.length; index++) {
          const element = files[index];
          tempList.push("uploads/" + element);
        }

        const populate = [
          "route",
          "parent",
          "bus",
          "device",
          "designation",
          "department",
        ];

        const results = await paginatedQuery(
          Employee,
          query,
          {},
          page,
          limit,
          sort,
          populate
        );

        if (!results) {
          return res.status(200).json({ msg: "Page limit exceeded!" });
        }

        const filteredEmployees = results.result.filter((employee) => {
          const photoUrl = employee.photoUrl;
          return tempList.includes(photoUrl);
        });

        const tempFilteredEmployees = [];
        for (let index = 0; index < filteredEmployees.length; index++) {
          const element = filteredEmployees[index];
          if (!element.numbers) {
            tempFilteredEmployees.push(element);
          } else {
            if (element.numbers.length == 0) {
              tempFilteredEmployees.push(element);
            }
          }
        }
        res.json(filteredEmployees);
      });
    } else if (id == "D-54") {
      const populate = [
        "route",
        "parent",
        "bus",
        "device",
        "designation",
        "department",
      ];

      const results = await paginatedQuery(
        Employee,
        query,
        {},
        page,
        limit,
        sort,
        populate
      );

      if (!results) {
        return res.status(200).json({ msg: "Page limit exceeded!" });
      }

      const employees = results.result;
      const tempFilteredEmployees = [];
      for (let index = 0; index < employees.length; index++) {
        const element = employees[index];
        if (!element.numbers) {
          tempFilteredEmployees.push(element);
        } else {
          if (element.numbers.length == 0) {
            tempFilteredEmployees.push(element);
          }
        }
      }
      res.json(tempFilteredEmployees);
    } else {
      const populate = [
        "route",
        "parent",
        "bus",
        "device",
        "designation",
        "department",
      ];

      const results = await paginatedQuery(
        Employee,
        query,
        {},
        page,
        limit,
        sort,
        populate
      );

      if (!results) {
        return res.status(200).json({ msg: "Page limit exceeded!" });
      }

      const employees = results.result;
      console.log("employees.length :>>", employees.length);
      log("get-employees", JSON.stringify(employees));

      res.json(employees);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// app.get('/mobile/get-employees/:id', async (req, res) => {
//   const { id } = req.params;
//   try {
//     const employees = await Employee.find({ userID: id }).populate(['route', 'parent', 'bus', 'device', 'designation', 'department']).lean();
//     res.json(employees);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

app.post("/mobile/get-employees", async (req, res) => {
  const { id, page, limit, sort, search } = req.body;
  const currentPage = page ? parseInt(page, 10) : 1;
  const resultsPerPage = limit ? parseInt(limit, 10) : 10;
  // const sortField = sort === 'asc' ? 'name' : sort === 'desc' ? '-name' : null; // Sorting by name

  try {
    const skip = (currentPage - 1) * resultsPerPage;

    let query = { userID: id };
    if (search) {
      // Add a search condition to the query to match against employee names
      query.name = { $regex: new RegExp(search, "i") }; // Case-insensitive search
    }

    const employees = await Employee.find(query)
      .populate([
        "route",
        "parent",
        "bus",
        "device",
        "designation",
        "department",
      ])
      .select([
        "name",
        "phone",
        "department",
        "designation",
        "bus",
        "admissionNo",
        "photoUrl",
        "parent",
        "route",
      ])
      // .sort(sortField)
      .skip(skip)
      .limit(resultsPerPage)
      .lean();

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/mobile/get-employees-count", async (req, res) => {
  try {
    const totalEmployeesCount = await Employee.countDocuments();

    res.json(totalEmployeesCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/accuracy-check", async (req, res) => {
  const { userID } = req.body;
  try {
    res.json({ accuracy: 63, detection: 0, quality: 0, distance: 0.8 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// app.post('/post-attendance', async (req, res) => {
//   const { employeeId, timestamp, deviceID } = req.body;
//   Employee.findById(employeeId, async (err, employee) => {
//     if (err) {
//       console.error(err);
//       res.status(500).send('Error finding employee');
//       return;
//     }
//     if (!employee) {
//       res.status(404).send('Employee not found');
//       return;
//     }
//     Attendance.findOne({ employee: employeeId, exitTime: null }, async (err, attendance) => {
//       if (err) {
//         console.error(err);
//         res.status(500).send('Error finding attendance record');
//         return;
//       }
//       var type = 'entry';
//       if (!attendance) {
//         var latestEntry = await Attendance.findOne({ employee: employeeId, exitTime: new Date(timestamp), })
//           .sort({ exitTime: -1 }).exec();
//         if (latestEntry) {
//           var differenceMs = new Date(timestamp) - latestEntry.exitTime;
//           var differenceMinutes = differenceMs / (1000 * 60);
//           if (differenceMinutes > 10) {
//             attendance = new Attendance({
//               employee: employeeId,
//               deviceID: deviceID,
//               entryTime: new Date(timestamp),
//             });
//             await attendance.save(async (err) => {
//               if (err) {
//                 console.error(err);
//                 res.status(500).send('Error saving attendance record');
//                 return;
//               }
//               notification = new AttendanceEvent({
//                 studentID: employeeId,
//                 type: type,
//                 status: -1,
//                 time: new Date(timestamp)
//               });
//               await notification.save((err) => {
//                 if (err) {
//                   console.error(err);
//                   res.status(500).send('Error saving attendance record');
//                   return;
//                 }
//                 res.send('Attendance recorded successfully');
//               });
//             });
//           }
//         } else {
//           attendance = new Attendance({
//             employee: employeeId,
//             deviceID: deviceID,
//             entryTime: new Date(timestamp),
//           });
//           await attendance.save(async (err) => {
//             if (err) {
//               console.error(err);
//               res.status(500).send('Error saving attendance record');
//               return;
//             }
//             notification = new AttendanceEvent({
//               studentID: employeeId,
//               type: type,
//               status: -1,
//               time: new Date(timestamp)
//             });
//             await notification.save((err) => {
//               if (err) {
//                 console.error(err);
//                 res.status(500).send('Error saving attendance record');
//                 return;
//               }
//               res.send('Attendance recorded successfully');
//             });
//           });
//         }
//       } else {
//         type = 'exit';
//         var differenceMs = new Date(timestamp) - attendance.entryTime;
//         var differenceMinutes = differenceMs / (1000 * 60);
//         if (differenceMinutes > 10) {
//           attendance.exitTime = new Date(timestamp);

//           await attendance.save(async (err) => {
//             if (err) {
//               console.error(err);
//               res.status(500).send('Error saving attendance record');
//               return;
//             }
//             notification = new AttendanceEvent({
//               studentID: employeeId,
//               type: type,
//               status: -1,
//               time: new Date(timestamp)
//             });
//             await notification.save((err) => {
//               if (err) {
//                 console.error(err);
//                 res.status(500).send('Error saving attendance record');
//                 return;
//               }
//               res.send('Attendance recorded successfully');
//             });
//           });
//         }
//       }
//     });
//   });
// });

function isTimeInRange(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Define the start and end times in hours and minutes
  const startTime = 5 * 60 + 45; // 5:45 AM in minutes
  const endTime = 15 * 60 + 15; // 3:15 PM in minutes

  // Convert current time to minutes
  const currentTime = hours * 60 + minutes;

  // Check if the current time is between 5:45 AM and 3:15 PM
  return currentTime >= startTime && currentTime <= endTime;
}

app.post("/post-attendance", async (req, res) => {
  const { employeeId, timestamp, deviceID, userID, latitude, longitude } =
    req.body;

  var employee = await Employee.findById(employeeId).exec();
  if (!employee) return res.send("Attendance recorded successfully");

  try {
    var attendance = await Attendance.findOne({
      employee: employeeId,
      type: "entry",
    }).exec();
    var type = "entry";
    if (!attendance || attendance == null) {
      const latestEntry = await Attendance.findOne({
        employee: employeeId,
        type: "exit",
      })
        .sort({ exitTime: -1 })
        .exec();
      if (latestEntry) {
        var differenceMs = new Date(timestamp) - latestEntry.exitTime;
        var differenceMinutes = differenceMs / (1000 * 60);
        if (differenceMinutes > 2) {
          const storeAttendance = new Attendance({
            type,
            employee: employeeId,
            deviceID: deviceID,
            userID,
            latitude,
            longitude,
            entryTime: new Date(timestamp),
            exitTime: new Date(timestamp),
          });
          const attendanceID = await storeAttendance.save();
          console.log(attendanceID);
          if (attendanceID) {
            notification = new AttendanceEvent({
              studentID: employeeId,
              type: type,
              userID,
              attendance: attendanceID._id,
              deviceID: deviceID,
              status: -1,
              time: new Date(timestamp),
            });
            const noti = await notification.save();
            if (noti) {
              res.send("Attendance recorded successfully");
            } else {
              res.send("Attendance recorded successfully");
            }
          } else {
            res.send("Attendance recorded successfully");
          }
        }
      } else {
        res.send("Attendance recorded successfully");
      }
    } else {
      type = "exit";
      var differenceMs = new Date(timestamp) - attendance.entryTime;
      var differenceMinutes = differenceMs / (1000 * 60);
      if (differenceMinutes > 2) {
        attendance.exitTime = new Date(timestamp);
        attendance.latitude2 = latitude;
        attendance.longitude2 = longitude;
        attendance.type = "exit";
        const attendanceID = await attendance.save();
        console.log(attendanceID);
        if (attendanceID) {
          notification = new AttendanceEvent({
            studentID: employeeId,
            type: type,
            userID,
            deviceID: deviceID,
            attendance: attendanceID._id,
            status: -1,
            time: new Date(timestamp),
          });
          const noti = await notification.save();
          if (noti) {
            res.send("Attendance recorded successfully");
          } else {
            res.send("Attendance recorded successfully");
          }
        } else {
          res.send("Attendance recorded successfully");
        }
      } else {
        res.send("Attendance recorded successfully");
      }
    }
  } catch (e) {
    print(e);
    res.send("Attendance recorded successfully");
  }

  // } else {
  //   res.send('Attendance recorded successfully');
  // }
});

app.get("/get-all-attendance/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const attendance = await Attendance.find({ userID: id }).populate({
      path: "employee",
      populate: [
        {
          path: "route",
          model: "Route",
        },
        {
          path: "parent",
          model: "Parent",
        },
        {
          path: "bus",
          model: "Bus",
        },
      ],
    });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/get-attendance", (req, res) => {
  const { startDate, endDate } = req.body;
  Attendance.find(
    {
      entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
    },
    (err, attendance) => {
      if (err) {
        res.status(500).send("Error finding attendance records");
        return;
      }
      res.send(attendance);
    }
  );
});

app.post("/employee/get-attendance", (req, res) => {
  const { startDate, endDate, employee } = req.body;
  Attendance.find(
    {
      employee: employee,
      entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
    },
    (err, attendance) => {
      if (err) {
        res.status(500).send("Error finding attendance records");
        return;
      }
      const presentDates = [];
      const absentDates = [];
      const halfDayDates = [];
      const lateDates = [];
      const holidayDates = [];

      // Loop through the attendance records and classify each date as present or absent
      for (
        let date = new Date(startDate);
        date <= new Date(endDate);
        date.setDate(date.getDate() + 1)
      ) {
        const dateStr = date.toDateString();
        const attendanceRecord = attendance.find(
          (record) => record.entryTime.toDateString() === dateStr
        );
        if (attendanceRecord) {
          presentDates.push(date.toUTCString().replace(" GMT", ""));
        } else {
          absentDates.push(date.toUTCString().replace(" GMT", ""));
        }

        if (endDate - startDate < 16 * 60 * 60 * 1000) {
          halfDayDates.push(date.toUTCString().replace(" GMT", ""));
        }
      }

      const response = {
        presentDates,
        absentDates,
        halfDayDates,
        holidayDates,
        lateDates,
      };
      res.send(response);
    }
  );
});

app.post("/mobile/get-attendance/:id", async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, busID, search } = req.body;
  if (busID != "all") {
    if (busID != null || busID != "null") {
      const resultBus = await Bus.find({
        _id: { $in: busID.split(", ") },
      }).exec();
      const resultDevice = await Device.find({
        _id: { $in: resultBus.map((element) => element.device) },
      }).exec();
      try {
        const attendance = await Attendance.find({
          entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
          exitTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
          deviceID: { $in: resultDevice.map((element) => element.deviceID) },
          userID: id,
        }).populate({
          path: "employee",
          populate: [
            {
              path: "route",
              model: "Route",
            },
            {
              path: "parent",
              model: "Parent",
            },
            {
              path: "bus",
              model: "Bus",
            },
            {
              path: "department",
              model: "Department",
            },
            {
              path: "designation",
              model: "Designation",
            },
          ],
          select:
            "_id name phone email joining department designation bus parent device userID admissionNo adhaarNo photoUrl",
        });
        if (search != "") {
          const finalList = [];
          for (let index = 0; index < attendance.length; index++) {
            const element = attendance[index];
            if (
              element.employee.admissionNo
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              element.employee.name
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              element.employee.phone
                .toLowerCase()
                .includes(search.toLowerCase())
            ) {
              finalList.push(element);
            }
          }
          res.json(finalList);
        } else {
          res.json(attendance);
        }
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    }
  } else {
    try {
      const attendance = await Attendance.find({
        entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
        exitTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
        userID: id,
      }).populate({
        path: "employee",
        populate: [
          {
            path: "route",
            model: "Route",
          },
          {
            path: "parent",
            model: "Parent",
          },
          {
            path: "bus",
            model: "Bus",
          },
          {
            path: "department",
            model: "Department",
          },
          {
            path: "designation",
            model: "Designation",
          },
        ],
        select:
          "_id name phone email joining department designation bus parent device userID admissionNo adhaarNo photoUrl",
      });
      if (search != "") {
        const finalList = [];
        for (let index = 0; index < attendance.length; index++) {
          const element = attendance[index];
          if (
            element.employee.admissionNo
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            element.employee.name
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            element.employee.phone.toLowerCase().includes(search.toLowerCase())
          ) {
            finalList.push(element);
          }
        }
        res.json(finalList);
      } else {
        res.json(attendance);
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
});

app.post("/mobile/get-selected-attendance/:id", async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, query, busID, search } = req.body;
  if (busID != "all") {
    if (busID != null || busID != "null") {
      const resultBus = await Bus.find({
        _id: { $in: busID.split(", ") },
      }).exec();
      const resultDevice = await Device.find({
        _id: { $in: resultBus.map((element) => element.device) },
      }).exec();
      try {
        const attendance = await Attendance.find({
          entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
          exitTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
          deviceID: { $in: resultDevice.map((element) => element.deviceID) },
          userID: id,
        }).populate({
          path: "employee",
          populate: [
            {
              path: "route",
              model: "Route",
            },
            {
              path: "parent",
              model: "Parent",
            },
            {
              path: "bus",
              model: "Bus",
            },
            {
              path: "department",
              model: "Department",
            },
            {
              path: "designation",
              model: "Designation",
            },
          ],
          select:
            "_id name phone email joining department designation bus parent device userID admissionNo adhaarNo photoUrl",
        });
        if (search != "") {
          const finalList = [];
          for (let index = 0; index < attendance.length; index++) {
            const element = attendance[index];
            if (
              element.employee.admissionNo
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              element.employee.name
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              element.employee.phone
                .toLowerCase()
                .includes(search.toLowerCase())
            ) {
              finalList.push(element);
            }
          }
          res.json(finalList);
        } else {
          res.json(attendance);
        }
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    }
  } else {
    try {
      const attendance = await Attendance.find({
        entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
        exitTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
        userID: id,
      }).populate({
        path: "employee",
        populate: [
          {
            path: "route",
            model: "Route",
          },
          {
            path: "parent",
            model: "Parent",
          },
          {
            path: "bus",
            model: "Bus",
          },
          {
            path: "department",
            model: "Department",
          },
          {
            path: "designation",
            model: "Designation",
          },
        ],
        select:
          "_id name phone email joining department designation bus parent device userID admissionNo adhaarNo photoUrl",
      });
      if (search != "") {
        const finalList = [];
        for (let index = 0; index < attendance.length; index++) {
          const element = attendance[index];
          if (
            element.employee.admissionNo
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            element.employee.name
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            element.employee.phone.toLowerCase().includes(search.toLowerCase())
          ) {
            finalList.push(element);
          }
        }
        res.json(finalList);
      } else {
        res.json(attendance);
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
});

app.post("/mobile-parent/get-attendance", async (req, res) => {
  const { startDate, endDate, parentID } = req.body;
  try {
    const attendance = await Attendance.find({
      entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
      exitTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).populate({
      path: "employee",
      populate: [
        {
          path: "route",
          model: "Route",
        },
        {
          path: "parent",
          model: "Parent",
        },
        {
          path: "bus",
          model: "Bus",
        },
        {
          path: "department",
          model: "Department",
        },
        {
          path: "designation",
          model: "Designation",
        },
      ],
      select:
        "_id name phone email joining department designation bus parent device userID admissionNo adhaarNo photoUrl",
    });
    const resultList = [];
    for (let index = 0; index < attendance.length; index++) {
      const element = attendance[index];
      if (element.employee.phone == parentID) {
        resultList.push(element);
      }
    }
    res.json(resultList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/today-attendance-count/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
      0,
      0,
      0,
      -1
    );
    const count = await Attendance.countDocuments({
      entryTime: { $gte: startOfDay, $lte: endOfDay },
      userID: id,
    }).exec();
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/today-attendance-count-exited/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
      0,
      0,
      0,
      -1
    );
    const count = await Attendance.countDocuments({
      exitTime: { $gte: startOfDay, $lte: endOfDay },
      userID: id,
    }).exec();
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/total-employee-count", async (req, res) => {
  try {
    const count = await Employee.countDocuments().exec();
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/total-data-count/:id", async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, busID, search } = req.body;
  const count = await Employee.countDocuments({
    numbers: { $exists: true, $not: { $size: 0 } },
  }).exec();
  if (busID != "all") {
    if (busID != null || busID != "null") {
      const resultBus = await Bus.find({
        _id: { $in: busID.split(", ") },
      }).exec();
      const resultDevice = await Device.find({
        _id: { $in: resultBus.map((element) => element.device) },
      }).exec();
      try {
        const attendance = await Attendance.distinct("employee", {
          entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
          exitTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
          deviceID: { $in: resultDevice.map((element) => element.deviceID) },
          userID: id,
        }).populate({
          path: "employee",
          populate: [
            {
              path: "route",
              model: "Route",
            },
            {
              path: "parent",
              model: "Parent",
            },
            {
              path: "bus",
              model: "Bus",
            },
            {
              path: "department",
              model: "Department",
            },
            {
              path: "designation",
              model: "Designation",
            },
          ],
          select:
            "_id name phone email joining department designation bus parent device userID admissionNo adhaarNo photoUrl",
        });
        if (search != "") {
          const finalList = [];
          for (let index = 0; index < attendance.length; index++) {
            const element = attendance[index];
            if (
              element.employee.admissionNo
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              element.employee.name
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              element.employee.phone
                .toLowerCase()
                .includes(search.toLowerCase())
            ) {
              finalList.push(element);
            }
          }
          // res.json(finalList);
          var entryCount = 0;
          var exitCount = 0;
          var presentCount = 0;
          var missedCount = 0;
          var absentCount = 0;
          for (let index = 0; index < finalList.length; index++) {
            const element = finalList[index];
            if (element.type == "entry") {
              entryCount++;
            } else {
              entryCount++;
              exitCount++;
            }
            presentCount++;
          }
          missedCount = entryCount - exitCount;
          absentCount = count - presentCount;
          res.json({
            present: presentCount,
            absent: absentCount,
            total: count,
            checkIn: entryCount,
            checkOut: exitCount,
            missed: missedCount,
          });
        } else {
          // res.json(attendance);
          var entryCount = 0;
          var exitCount = 0;
          var presentCount = 0;
          var missedCount = 0;
          var absentCount = 0;
          for (let index = 0; index < attendance.length; index++) {
            const element = attendance[index];
            if (element.type == "entry") {
              entryCount++;
            } else {
              entryCount++;
              exitCount++;
            }
            presentCount++;
          }
          missedCount = entryCount - exitCount;
          absentCount = count - presentCount;
          res.json({
            present: presentCount,
            absent: absentCount,
            total: count,
            checkIn: entryCount,
            checkOut: exitCount,
            missed: missedCount,
          });
        }
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    }
  } else {
    try {
      const attendance = await Attendance.distinct("employee", {
        entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
        exitTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
        userID: id,
      }).populate({
        path: "employee",
        populate: [
          {
            path: "route",
            model: "Route",
          },
          {
            path: "parent",
            model: "Parent",
          },
          {
            path: "bus",
            model: "Bus",
          },
          {
            path: "department",
            model: "Department",
          },
          {
            path: "designation",
            model: "Designation",
          },
        ],
        select:
          "_id name phone email joining department designation bus parent device userID admissionNo adhaarNo photoUrl",
      });
      if (search != "") {
        const finalList = [];
        for (let index = 0; index < attendance.length; index++) {
          const element = attendance[index];
          if (
            element.employee.admissionNo
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            element.employee.name
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            element.employee.phone.toLowerCase().includes(search.toLowerCase())
          ) {
            finalList.push(element);
          }
        }
        // res.json(finalList);
        var entryCount = 0;
        var exitCount = 0;
        var presentCount = 0;
        var missedCount = 0;
        var absentCount = 0;
        for (let index = 0; index < finalList.length; index++) {
          const element = finalList[index];
          if (element.type == "entry") {
            entryCount++;
          } else {
            entryCount++;
            exitCount++;
          }
          presentCount++;
        }
        missedCount = entryCount - exitCount;
        absentCount = count - presentCount;
        res.json({
          present: presentCount,
          absent: absentCount,
          total: count,
          checkIn: entryCount,
          checkOut: exitCount,
          missed: missedCount,
        });
      } else {
        // res.json(attendance);
        var entryCount = 0;
        var exitCount = 0;
        var presentCount = 0;
        var missedCount = 0;
        var absentCount = 0;
        for (let index = 0; index < attendance.length; index++) {
          const element = attendance[index];
          if (element.type == "entry") {
            entryCount++;
          } else {
            entryCount++;
            exitCount++;
          }
          presentCount++;
        }
        missedCount = entryCount - exitCount;
        absentCount = count - presentCount;
        res.json({
          present: presentCount,
          absent: absentCount,
          total: count,
          checkIn: entryCount,
          checkOut: exitCount,
          missed: missedCount,
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
});

app.post("/api/bus-tracks", async (req, res) => {
  const {
    latitude,
    longitude,
    speed,
    angle,
    trackerTime,
    deviceID,
    userID,
    status,
    level,
  } = req.body;
  try {
    const bus = await Device.findOne({ deviceID: deviceID });
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }
    bus.latitude = latitude;
    bus.longitude = longitude;
    bus.speed = speed;
    bus.userID = userID;
    bus.angle = angle;
    bus.trackerTime = trackerTime;
    bus.status = status;
    bus.level = level;
    await bus.save();
    const busTrack = new BusTrack(req.body);
    const resp = await busTrack.save();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/bus-tracks/:id", async (req, res) => {
  const { id } = req.params;
  BusTrack.find({ userID: id }, (err, busTracks) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(busTracks);
    }
  });
});

app.get("/api/get-bus-data/:busID", async (req, res) => {
  const { busID } = req.params;
  Device.findById(busID, (err, busTracks) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(busTracks);
    }
  });
});

app.get("/mobile-parent/track-bus/:id", async (req, res) => {
  try {
    const userAll = await Employee.find()
      .select([
        "_id",
        "name",
        "device",
        "email",
        "phone",
        "department",
        "designation",
        "bus",
        "admissionNo",
        "photoUrl",
        "userID",
      ])
      .populate(["department", "designation", "bus", "device"]);
    const result = [];
    for (let index = 0; index < userAll.length; index++) {
      const element = userAll[index];
      if (element.phone == req.params.id) {
        result.push(element);
      }
    }
    res.status(201).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: "An error occurred.", success: false });
  }
});

app.get("/mobile-parent/all-track-bus/:id", async (req, res) => {
  try {
    const result = await Bus.find({ parent: req.params.id }).populate([
      "device",
      "staff",
    ]);
    res.status(201).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: "An error occurred.", success: false });
  }
});

app.post("/mobile-parent/notifications/:id", async (req, res) => {
  try {
    const userAll = await Employee.find().select([
      "_id",
      "name",
      "email",
      "phone",
      "department",
      "designation",
      "bus",
      "admissionNo",
      "photoUrl",
      "userID",
    ]);
    const result = [];
    for (let index = 0; index < userAll.length; index++) {
      const element = userAll[index];
      if (element.phone == req.params.id) {
        result.push(element);
      }
    }
    var ids = [];
    for (let index = 0; index < result.length; index++) {
      const element = result[index];
      ids.push(element._id);
    }
    const attendance = await AttendanceEvent.find({ studentID: { $in: ids } })
      .populate("attendance")
      .sort({ time: -1 });
    var results = [];

    for (let index = 0; index < attendance.length; index++) {
      const element = attendance[index];
      for (let j = 0; j < result.length; j++) {
        if (element.studentID == result[j]._id) {
          element.studentID = result[j];
          results.push(element);
        }
      }
    }
    res.status(201).json({ success: true, results });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred.", success: false });
  }
});

app.post("/mobile-parent/all-notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, busID, search, page, pageSize } = req.body;

    let resultDeviceIds = [];
    if (busID !== "all" && busID !== "null" && busID !== null) {
      const busIds = busID.split(", ");
      const resultBuses = await Bus.find({ _id: { $in: busIds } }).populate(
        "device"
      );
      resultDeviceIds = resultBuses.map((element) => element.device.deviceID);
    }
    const result = await Employee.find({ userID: id })
      .populate(["route", "parent", "bus", "department", "designation"])
      .select([
        "_id",
        "name",
        "phone",
        "department",
        "designation",
        "bus",
        "admissionNo",
        "photoUrl",
      ]);

    const attendanceQuery = {
      time: { $gte: new Date(startDate), $lte: new Date(endDate) },
      userID: id,
    };

    if (resultDeviceIds.length > 0) {
      attendanceQuery.deviceID = { $in: resultDeviceIds };
    }
    const attendance = await AttendanceEvent.find(attendanceQuery)
      .populate("attendance")
      .sort({ time: -1 });
    const results = attendance
      .map((element) => {
        const student = result.find((r) => r._id.equals(element.studentID));
        if (student) {
          element.studentID = student;
          return element;
        }
      })
      .filter(Boolean);

    if (search) {
      const finalList = results.filter((element) => {
        const student = element.studentID;
        return (
          student.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
          student.name.toLowerCase().includes(search.toLowerCase()) ||
          student.phone.toLowerCase().includes(search.toLowerCase())
        );
      });

      const paginatedResults = finalList.slice(
        (page - 1) * pageSize,
        page * pageSize
      );
      res.status(201).json({ success: true, results: paginatedResults });
    } else {
      const paginatedResults = results.slice(
        (page - 1) * pageSize,
        page * pageSize
      );
      res.status(201).json({ success: true, results: paginatedResults });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred.", success: false });
  }
});

// app.post('/mobile-parent/all-notifications/:id', async (req, res) => {
//   const { id } = req.params;
//   const { startDate, endDate, busID, search, page, pageSize } = req.body;
//   console.log(search);
//   if (busID != 'all') {
//     if (busID != null || busID != 'null') {
//       const resultBus = await Bus.find({ _id: { $in: busID.split(', ') } }).exec();
//       const resultDevice = await Device.find({ _id: { $in: resultBus.map(element => element.device) } }).exec();
//       try {
//         const result = await Employee.find({ userID: req.params.id }).populate(['route', 'parent', 'bus', 'department', 'designation']);
//         const attendance = await AttendanceEvent.find({
//           time: { $gte: new Date(startDate), $lte: new Date(endDate) },
//           deviceID: { $in: resultDevice.map(element => element.deviceID) },
//           userID: id
//         }).sort({ time: -1 });

//         // Calculate the skip value for pagination
//         const skip = (page - 1) * pageSize;

//         var results = [];
//         for (let index = 0; index < attendance.length; index++) {
//           const element = attendance[index];
//           for (let j = 0; j < result.length; j++) {
//             if (element.studentID == result[j]._id) {
//               element.studentID = result[j];
//               results.push(element);
//             }
//           }
//         }

//         if (search != '') {
//           console.log('Here');
//           const finalList = [];
//           for (let index = 0; index < results.length; index++) {
//             const element = results[index];
//             if (element.studentID.admissionNo.toLowerCase().includes(search.toLowerCase()) || element.studentID.route.name.toLowerCase().includes(search.toLowerCase()) || element.studentID.name.toLowerCase().includes(search.toLowerCase()) || element.studentID.phone.toLowerCase().includes(search.toLowerCase()) || element.studentID.email.toLowerCase().includes(search.toLowerCase())) {
//               finalList.push(element);
//             }
//           }

//           // Apply pagination to the finalList
//           const paginatedResults = finalList.slice(skip, skip + pageSize);

//           res.status(201).json({ success: true, results: paginatedResults });
//         } else {
//           // Apply pagination to the results
//           const paginatedResults = results.slice(skip, skip + pageSize);

//           res.status(201).json({ success: true, results: paginatedResults });
//         }
//       } catch (error) {
//         console.log(error);
//         res.status(500).json({ error: 'An error occurred.', success: false });
//       }
//     }
//   } else {
//     try {
//       const result = await Employee.find({ userID: req.params.id }).populate(['route', 'parent', 'bus', 'department', 'designation']);
//       const attendance = await AttendanceEvent.find().sort({ time: -1 });

//       // Calculate the skip value for pagination
//       const skip = (page - 1) * pageSize;

//       var results = [];
//       for (let index = 0; index < attendance.length; index++) {
//         const element = attendance[index];
//         for (let j = 0; j < result.length; j++) {
//           if (element.studentID == result[j]._id) {
//             element.studentID = result[j];
//             results.push(element);
//           }
//         }
//       }

//       if (search != '') {
//         console.log('Here');
//         const finalList = [];
//         for (let index = 0; index < results.length; index++) {
//           const element = results[index];
//           if (element.studentID.admissionNo.toLowerCase().includes(search.toLowerCase()) || element.studentID.route.name.toLowerCase().includes(search.toLowerCase()) || element.studentID.name.toLowerCase().includes(search.toLowerCase()) || element.studentID.phone.toLowerCase().includes(search.toLowerCase()) || element.studentID.email.toLowerCase().includes(search.toLowerCase())) {
//             finalList.push(element);
//           }
//         }

//         // Apply pagination to the finalList
//         const paginatedResults = finalList.slice(skip, skip + pageSize);

//         res.status(201).json({ success: true, results: paginatedResults });
//       } else {
//         // Apply pagination to the results
//         const paginatedResults = results.slice(skip, skip + pageSize);

//         res.status(201).json({ success: true, results: paginatedResults });
//       }
//     } catch (error) {
//       console.log(error);
//       res.status(500).json({ error: 'An error occurred.', success: false });
//     }
//   }
// });

// app.post('/mobile-parent/all-notifications/:id', async (req, res) => {
//   const { id } = req.params;
//   const { startDate, endDate, busID, search } = req.body;
//   console.log(search);
//   if (busID != 'all') {
//     if (busID != null || busID != 'null') {
//       const resultBus = await Bus.find({ _id: { $in: busID.split(', ') } }).exec();
//       const resultDevice = await Device.find({ _id: { $in: resultBus.map(element => element.device) } }).exec();
//       try {
//         const result = await Employee.find({ userID: req.params.id }).populate(['route', 'parent', 'bus', 'department', 'designation']);
//         const attendance = await AttendanceEvent.find({
//           time: { $gte: new Date(startDate), $lte: new Date(endDate) },
//           deviceID: { $in: resultDevice.map(element => element.deviceID) },
//           userID: id
//         }).sort({ time: -1 });
//         var results = [];
//         for (let index = 0; index < attendance.length; index++) {
//           const element = attendance[index];
//           for (let j = 0; j < result.length; j++) {
//             if (element.studentID == result[j]._id) {
//               element.studentID = result[j];
//               results.push(element);
//             }
//           }
//         }
//         if (search != '') {
//           console.log('Here');
//           const finalList = [];
//           for (let index = 0; index < results.length; index++) {
//             const element = results[index];
//             if (element.studentID.admissionNo.toLowerCase().includes(search.toLowerCase()) || element.studentID.route.name.toLowerCase().includes(search.toLowerCase()) || element.studentID.name.toLowerCase().includes(search.toLowerCase()) || element.studentID.phone.toLowerCase().includes(search.toLowerCase()) || element.studentID.email.toLowerCase().includes(search.toLowerCase())) {
//               finalList.push(element);
//             }
//           }
//           res.status(201).json({ success: true, results: finalList });
//         }
//         else {
//           res.status(201).json({ success: true, results: results });
//         }
//       }
//       catch (error) {
//         console.log(error);
//         res.status(500).json({ error: 'An error occurred.', success: false });
//       }
//     }
//   } else {
//     try {
//       const result = await Employee.find({ userID: req.params.id }).populate(['route', 'parent', 'bus', 'department', 'designation']);
//       const attendance = await AttendanceEvent.find().sort({ time: -1 });
//       var results = [];
//       for (let index = 0; index < attendance.length; index++) {
//         const element = attendance[index];
//         for (let j = 0; j < result.length; j++) {
//           if (element.studentID == result[j]._id) {
//             element.studentID = result[j];
//             results.push(element);
//           }
//         }
//       }
//       if (search != '') {
//         console.log('Here');
//         const element = results[0];
//         console.log(element);
//         const finalList = [];
//         for (let index = 0; index < results.length; index++) {
//           const element = results[index];
//           if (element.studentID.admissionNo.toLowerCase().includes(search.toLowerCase()) || element.studentID.route.name.toLowerCase().includes(search.toLowerCase()) || element.studentID.name.toLowerCase().includes(search.toLowerCase()) || element.studentID.phone.toLowerCase().includes(search.toLowerCase()) || element.studentID.email.toLowerCase().includes(search.toLowerCase())) {
//             finalList.push(element);
//           }
//         }
//         res.status(201).json({ success: true, results: finalList });
//       }
//       else {
//         res.status(201).json({ success: true, results: results });
//       }
//     }
//     catch (error) {
//       console.log(error);
//       res.status(500).json({ error: 'An error occurred.', success: false });
//     }
//   }
// });

app.post("/post-routes", (req, res) => {
  const { name, address, userID } = req.body;
  const route = new Route({ name, address, userID });
  route
    .save()
    .then((result) => {
      res.status(201).json(result);
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while creating the route." });
    });
});

// Get all routes
app.get("/all-routes/:id", async (req, res) => {
  Route.find({ userID: req.params.id })
    .then((routes) => {
      res.json(routes);
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while retrieving the routes." });
    });
});

app.patch("/modify-routes/:id", (req, res) => {
  const { id } = req.params;
  const { name, address } = req.body;

  Route.findByIdAndUpdate(id, { name, address }, { new: true })
    .then((route) => {
      if (route) {
        res.json(route);
      } else {
        res.status(404).json({ error: "Route not found." });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while updating the route." });
    });
});

// Delete a specific route by ID
app.delete("/delete-routes/:id", (req, res) => {
  const { id } = req.params;

  Route.findByIdAndDelete(id)
    .then((route) => {
      if (route) {
        res.json({ message: "Route deleted successfully." });
      } else {
        res.status(404).json({ error: "Route not found." });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while deleting the route." });
    });
});

app.post("/buses", (req, res) => {
  const { staffId, deviceId, routeIds, name, userID } = req.body;

  Promise.all([
    Staff.findById(staffId),
    Device.findById(deviceId),
    Route.find({ _id: { $in: JSON.parse(routeIds) } }),
  ])
    .then(([staff, device, routes]) => {
      if (!staff) {
        return res.status(404).json({ error: "Staff not found." });
      }
      if (!device) {
        return res.status(404).json({ error: "Device not found." });
      }
      if (routes.length !== JSON.parse(routeIds).length) {
        return res.status(404).json({ error: "One or more routes not found." });
      }

      const bus = new Bus({
        staff: staff._id,
        device: device._id,
        route: routes.map((route) => route._id),
        userID,
        name,
      });

      return bus.save();
    })
    .then((result) => {
      res.status(201).json(result);
    })
    .catch((error) => {
      console.log(error);
      res
        .status(500)
        .json({ error: "An error occurred while creating the bus." });
    });
});

// Get all buses
app.get("/buses/:id", async (req, res) => {
  Bus.find({ userID: req.params.id })
    .populate("staff")
    .populate("device")
    .populate("route")
    .then((buses) => {
      res.json(buses);
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while retrieving the buses." });
    });
});

app.patch("/buses/:id", (req, res) => {
  const { id } = req.params;
  const { staffId, deviceId, routeIds, name } = req.body;

  Promise.all([
    Staff.findById(staffId),
    Device.findById(deviceId),
    Route.find({ _id: { $in: JSON.parse(routeIds) } }),
  ])
    .then(([staff, device, routes]) => {
      if (!staff) {
        return res.status(404).json({ error: "Staff not found." });
      }
      if (!device) {
        return res.status(404).json({ error: "Device not found." });
      }
      if (routes.length !== JSON.parse(routeIds).length) {
        return res.status(404).json({ error: "One or more routes not found." });
      }

      return Bus.findByIdAndUpdate(
        id,
        {
          staff: staff._id,
          device: device._id,
          route: routes.map((route) => route._id),
          name,
        },
        { new: true }
      );
    })
    .then((bus) => {
      if (bus) {
        res.json(bus);
      } else {
        res.status(404).json({ error: "Bus not found." });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while updating the bus." });
    });
});

app.post("/api/history/:id", async (req, res) => {
  const { id } = req.params;
  const { startTime, endTime, deviceID } = req.body;

  if (!startTime || !endTime) {
    return res
      .status(400)
      .json({ error: "Both startTime and endTime are required." });
  }

  try {
    const tracks = await BusTrack.find({
      userID: id,
      trackerTime: {
        $gte: new Date(startTime),
        $lte: new Date(endTime),
      },
      deviceID,
    });

    res.json(tracks);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});

app.patch("/api/switch-bus/:id", async (req, res) => {
  const { id } = req.params;
  const { bus1ID, bus2ID, reason, notes } = req.body;
  try {
    const bus = await Bus.findByIdAndUpdate(
      bus1ID,
      { replacement: true, replacementID: bus2ID, reason, notes },
      { new: true }
    );
    const bus2 = await Bus.findById(bus2ID);
    notification = new NotificationEvent({
      type: "replacement",
      userID: id,
      message: `This is to inform you that ${
        bus.name
      } is not available for today due to ${reason.toLowerCase()}. Instead ${
        bus2.name
      } will be replacing the default bus for today.`,
      status: -1,
      time: new Date(),
    });
    await notification.save((err) => {
      if (err) {
        res.status(500).send("Error saving attendance record");
        return;
      }
    });
    res
      .status(201)
      .json({ success: true, error: "Bus replaced successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/custom-notification/:id", async (req, res) => {
  const { id } = req.params;
  const { title, message, sendIDs } = req.body;
  try {
    notification = new NotificationEvent({
      type: "custom",
      userID: id,
      title: title,
      sendIDs: sendIDs,
      message: message,
      status: -1,
      time: new Date(),
    });
    await notification.save((err) => {
      if (err) {
        res.status(500).send("Error saving attendance record");
        return;
      }
    });
    res
      .status(201)
      .json({ success: true, error: "Notification sent successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a specific bus by ID
app.delete("/buses/:id", (req, res) => {
  const { id } = req.params;
  Bus.findByIdAndDelete(id)
    .then((bus) => {
      if (bus) {
        res.json({ message: "Bus deleted successfully." });
      } else {
        res.status(404).json({ error: "Bus not found." });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while deleting the bus." });
    });
});

app.post("/post-parent", async (req, res) => {
  const { name, email, phone, address, userID } = req.body;
  const parent = await Parent.findOne({ email });
  if (parent) {
    return res
      .status(409)
      .json({ message: "Email already taken", success: false });
  }
  const hashedPassword = await bcrypt.hash("123456", 10);
  const newUser = new Parent({
    email,
    password: hashedPassword,
    phone,
    address,
    name,
    userID,
  });
  await newUser.save();
  newUser
    .save()
    .then((result) => {
      res.status(201).json(result);
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while creating the parent." });
    });
});

app.patch("/modify-parent/:id", (req, res) => {
  const { id } = req.params;
  const { name, address } = req.body;

  Parent.findByIdAndUpdate(id, { name, address }, { new: true })
    .then((parent) => {
      if (parent) {
        res.json(parent);
      } else {
        res.status(404).json({ error: "Parent not found." });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while updating the parent." });
    });
});

app.get("/all-parents/:id", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const searchField = req.query["search-field"];
  const searchValue = req.query["search-value"];

  const query = { userID: req.params.id };

  if (searchField && searchValue) {
    if (searchField === "all") {
      const fields = ["name", "email", "phone", "address"];

      const searchQuery = createSearchQuery(fields, searchValue);
      query["$or"] = searchQuery["$or"];
    } else {
      const searchQuery = createSearchQuery([searchField], searchValue);
      query["$or"] = searchQuery["$or"];
    }
  }

  const results = await paginatedQuery(Parent, query, {}, page, limit, sort);

  if (!results) {
    return res.status(200).json({ msg: "Page limit exceeded!" });
  }

  res.status(200).json(results.result);
});

app.delete("/delete-parents/:id", (req, res) => {
  const { id } = req.params;

  Parent.findByIdAndDelete(id)
    .then((parent) => {
      if (parent) {
        res.json({ message: "Parent deleted successfully." });
      } else {
        res.status(404).json({ error: "Parent not found." });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while deleting the parent." });
    });
});

app.post("/mobile-parent/login", async (req, res) => {
  const { email, password } = req.body;

  const userAll = await Employee.find()
    .populate(["route", "parent", "bus", "device", "designation", "department"])
    .select([
      "_id",
      "name",
      "email",
      "phone",
      "department",
      "designation",
      "bus",
      "admissionNo",
      "photoUrl",
      "userID",
    ]);
  const user = [];
  for (let index = 0; index < userAll.length; index++) {
    const element = userAll[index];
    if (
      element.phone == email ||
      element.email == email ||
      element.admissionNo.toLowerCase() == email.toLowerCase()
    ) {
      user.push(element);
    }
  }

  if (!user) {
    return res
      .status(401)
      .json({ message: "Invalid email or password", success: false });
  }
  // const passwordMatch = await bcrypt.compare(password, user.password);
  // if (!passwordMatch) {
  //   return res.status(401).json({ message: 'Invalid email or password', success: false, user });
  // }
  if (user.length > 0) {
    res
      .status(200)
      .json({ message: "Logged in successfully", success: true, user: user });
  } else {
    return res
      .status(401)
      .json({ message: "Invalid email or password", success: false });
  }
});

app.get("/protected", authenticateToken, (req, res) => {
  res.status(200).json({ message: "Protected resource" });
});

// Middleware for authenticating JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = user;
    req.userID = user.email;
    next();
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
