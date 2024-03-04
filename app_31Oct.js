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

mongoose.connect("mongodb://localhost:27017/production", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  mobile: String,
  type: String,
});

const deviceSchema = mongoose.Schema({
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
  type: {
    type: String,
  },
  entryTime: { type: Date, index: true, unique: true, sparse: true },
  exitTime: { type: Date, index: true, unique: true, sparse: true },
  deviceID: {
    type: String,
    ref: "Device",
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const attendanceEventSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  studentID: { type: String, ref: "Employee" },
  deviceID: { type: String },
  type: { type: String },
  status: { type: Number },
  message: { type: String },
  time: { type: Date, index: true, unique: true, sparse: true },
});

const notificationEventSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: { type: String },
  status: { type: Number },
  message: { type: String },
  time: { type: Date },
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
  staff: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Staff" },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Device",
  },
  route: [
    { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Route" },
  ],
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String },
  replacement: { type: String },
  replacementID: { type: mongoose.Schema.Types.ObjectId, ref: "Bus" },
  reason: { type: String },
  notes: { type: String },
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

cron.schedule("*/5 * * * * *", async () => {
  const result = await AttendanceEvent.find({ status: -1 })
    .populate({
      path: "studentID",
      populate: [
        {
          path: "route",
          model: "Route",
        },
        {
          path: "department",
          model: "Department",
        },
        {
          path: "designation",
          model: "Designation",
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
          path: "device",
          model: "Device",
        },
      ],
    })
    .exec();
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
        }) has entered the school bus (${
          resultBus.name
        }) at ${initialTime.toLocaleString()}.`;
        var options = {
          method: "POST",
          url: "https://onesignal.com/api/v1/notifications",
          headers: {
            Authorization:
              "Basic YjcxY2YxMmUtMTYzNi00ZmMxLTgxNGUtODFjOTUxZThjMzcx",
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            app_id: "64726b7f-6e76-45b9-8748-6bacbe8a5533",
            // "included_segments": [
            //   "Subscribed Users"
            // ],
            include_external_user_ids: [
              element.studentID.parent._id,
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
        console.log(element.deviceID);
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
        }) has entered in a wrong school bus (${resultBus.name}) instead of ${
          element.studentID.device.deviceName
        } at ${initialTime.toLocaleString()}.`;
        var options = {
          method: "POST",
          url: "https://onesignal.com/api/v1/notifications",
          headers: {
            Authorization:
              "Basic YjcxY2YxMmUtMTYzNi00ZmMxLTgxNGUtODFjOTUxZThjMzcx",
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            app_id: "64726b7f-6e76-45b9-8748-6bacbe8a5533",
            // "included_segments": [
            //   "Subscribed Users"
            // ],
            include_external_user_ids: [
              element.studentID.parent._id,
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
            "Basic YjcxY2YxMmUtMTYzNi00ZmMxLTgxNGUtODFjOTUxZThjMzcx",
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          app_id: "64726b7f-6e76-45b9-8748-6bacbe8a5533",
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
app.get("/all-staff/:id", (req, res) => {
  const { id } = req.params;
  Staff.find({ userID: id })
    .then((staffMembers) => {
      res.json(staffMembers);
    })
    .catch((error) => {
      res.status(500).json({
        error: "An error occurred while retrieving the staff members.",
      });
    });
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
          } the school bus at ${element.time.toLocaleString()}.`,
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
      element.department = element.department.name;
      element.designation = element.designation.name;
      element.bus = element.bus.name;
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
    console.log(i);
    res.json(noImage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/get-employees/:id", async (req, res) => {
  const { id } = req.params;
  try {
    //{ userID: id }
    const employees = await Employee.find({
      device: { $ne: "64d5de146f10ae5cfa01e6c9" },
    })
      .populate([
        "route",
        "parent",
        "bus",
        "device",
        "designation",
        "department",
      ])
      .lean();
    const newEmployee = [];
    for (let index = 0; index < employees.length; index++) {
      const element = employees[index];
      if (
        element.device.deviceName == id ||
        element.name == "Prasun Ranjan" ||
        element.name == "Devendra Kumar Ojha" ||
        element.name == "Sumit Gurung"
      ) {
        newEmployee.push(element);
      }
    }
    res.json(newEmployee);
  } catch (error) {
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
  const sortField = sort === "asc" ? "name" : sort === "desc" ? "-name" : null; // Sorting by name

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
      .sort(sortField)
      .skip(skip)
      .limit(resultsPerPage)
      .lean();

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/accuracy-check", async (req, res) => {
  const { userID } = req.body;
  try {
    res.json({ accuracy: 56, detection: 0, quality: 0, distance: 0.9 });
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

app.post("/post-attendance", async (req, res) => {
  console.log(req.body);
  const { employeeId, timestamp, deviceID, userID } = req.body;
  if (employeeId) {
    var employee = await Employee.findById(employeeId).exec();
    try {
      if (!employee) {
        res.status(404).send("Employee not found");
        return;
      }
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
            storeAttendance = new Attendance({
              type,
              employee: employeeId,
              deviceID: deviceID,
              userID,
              entryTime: new Date(timestamp),
              exitTime: new Date(timestamp),
            });
            await storeAttendance.save(async (err) => {
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
                time: new Date(timestamp),
              });
              await notification.save((err) => {
                if (err) {
                  res.status(500).send("Error saving attendance record");
                  return;
                }
                res.send("Attendance recorded successfully");
              });
            });
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
              time: new Date(timestamp),
            });
            await notification.save((err) => {
              if (err) {
                res.status(500).send("Error saving attendance record");
                return;
              }
              res.send("Attendance recorded successfully");
            });
          });
        } else {
          res.send("Attendance recorded successfully");
        }
      }
    } catch (e) {
      console.log(e);
    }
  } else {
    res.send("Attendance recorded successfully");
  }
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

app.post("/mobile/get-attendance/:id", async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, busID, search } = req.body;
  console.log(search);
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
        });
        if (search != "") {
          console.log("Here");
          const finalList = [];
          for (let index = 0; index < attendance.length; index++) {
            const element = attendance[index];
            if (
              element.employee.admissionNo
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              element.employee.route.name
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              element.employee.name
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              element.employee.phone
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              element.employee.email
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
        console.log(error);
        res.status(500).json({ message: error.message });
      }
    }
  } else {
    try {
      const attendance = await Attendance.find({
        entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
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
      });
      if (search != "") {
        console.log("Here");
        const finalList = [];
        for (let index = 0; index < attendance.length; index++) {
          const element = attendance[index];
          if (
            element.employee.admissionNo
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            element.employee.route.name
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            element.employee.name
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            element.employee.phone
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            element.employee.email.toLowerCase().includes(search.toLowerCase())
          ) {
            finalList.push(element);
          }
        }
        res.json(finalList);
      } else {
        res.json(attendance);
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  }
});

app.post("/mobile-parent/get-attendance", async (req, res) => {
  console.log("HERE");
  const { startDate, endDate, parentID } = req.body;
  try {
    const attendance = await Attendance.find({
      entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
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
      ],
    });
    const resultList = [];
    console.log(attendance);
    console.log(parentID);
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

app.post("/api/bus-tracks", async (req, res) => {
  console.log(req.body);
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
    busTrack.save((err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
      } else {
        res.status(201).send("Bus track record created successfully");
      }
    });
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

app.get("/mobile-parent/track-bus/:id", async (req, res) => {
  try {
    const result = await Employee.find({ phone: req.params.id }).populate(
      "device"
    );
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
    const result = await Employee.find({ phone: req.params.id });
    var ids = [];
    for (let index = 0; index < result.length; index++) {
      const element = result[index];
      ids.push(element._id);
    }
    const attendance = await AttendanceEvent.find({
      studentID: { $in: ids },
    }).sort({ time: -1 });

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
      const resultBuses = await Bus.find({ _id: { $in: busIds } }).exec();
      resultDeviceIds = resultBuses.map((element) => element.device);
    }

    const result = await Employee.find({ userID: id }).populate([
      "route",
      "parent",
      "bus",
      "department",
      "designation",
    ]);

    const attendanceQuery = {
      time: { $gte: new Date(startDate), $lte: new Date(endDate) },
      userID: id,
    };

    if (resultDeviceIds.length > 0) {
      attendanceQuery.deviceID = { $in: resultDeviceIds };
    }

    const attendance = await AttendanceEvent.find(attendanceQuery).sort({
      time: -1,
    });

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
          student.route.name.toLowerCase().includes(search.toLowerCase()) ||
          student.name.toLowerCase().includes(search.toLowerCase()) ||
          student.phone.toLowerCase().includes(search.toLowerCase()) ||
          student.email.toLowerCase().includes(search.toLowerCase())
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

app.get("/all-parents/:id", (req, res) => {
  const { id } = req.params;
  Parent.find({ userID: req.params.id })
    .then((parents) => {
      res.json(parents);
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while retrieving the parents." });
    });
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
  const user = await Employee.find({
    $or: [{ phone: email }, { email: email }, { admissionNo: email }],
  });
  if (!user) {
    return res
      .status(401)
      .json({ message: "Invalid email or password", success: false });
  }
  // const passwordMatch = await bcrypt.compare(password, user.password);
  // if (!passwordMatch) {
  //   return res.status(401).json({ message: 'Invalid email or password', success: false, user });
  // }
  res
    .status(200)
    .json({ message: "Logged in successfully", success: true, user: user });
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
