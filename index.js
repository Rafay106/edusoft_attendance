require("dotenv").config();

// Connect to db
require("./config/db")();

// // Register schemas
// fs.readdirSync("./models").forEach(function (file) {
//   if (~file.indexOf(".js")) require(`./models/${file}`);
// });
// fs.readdirSync("./models/user").forEach(function (file) {
//   if (~file.indexOf(".js")) require(`./models/user/${file}`);
// });

const express = require("express");
const path = require("node:path");
const cron = require("node-cron");
const { errorHandler } = require("./middlewares/errorMiddleware");
const {
  adminAuthenticate,
  adminAuthorize,
  parentAuthenticate,
} = require("./middlewares/authMiddleware");
const { listenDeviceData, listenMobileData } = require("./services/listener");
const { sendPushNotification } = require("./tools/notifyPush");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

app.use(express.static(path.join(__dirname, "uploads")));

app.post("/api/listener/gps", listenDeviceData);
app.post("/api/listener/mobile", listenMobileData);

app.use("/api/login", require("./routes/authRoutes"));

app.use(
  "/api/admin",
  adminAuthenticate,
  adminAuthorize,
  require("./routes/adminRoutes")
);
app.use("/api/parent", parentAuthenticate, require("./routes/parentRoutes"));

/*************
 * Cron Jobs *
 *************/

// cron.schedule("* * * * * *", () => {
//   console.time("sendPush");
//   sendPushNotification();
//   console.timeEnd("sendPush");
// });

/*************
 * Cron Jobs *
 *************/

// test routes
app.use("/api/test", adminAuthenticate, require("./routes/testRoutes"));

app.use(errorHandler);

app.listen(process.env.PORT, () =>
  console.log(`attendance.edusoft.in running on port: ${PORT}`)
);
