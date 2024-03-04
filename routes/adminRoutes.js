const express = require("express");
const {
  memoryUpload,
  studentPhotoUpload,
  studentBulkImportUpload,
} = require("../middlewares/multerMiddleware");

const AC = require("../controllers/adminController");

const adminRouter = express.Router();

/**
 * Route: /api/admin/user
 */

// 1. User Routes
const userRouter = express.Router();

userRouter.route("/").get(AC.getUsers).post(AC.createUser);

// 2. School Routes
const schoolRouter = express.Router();

schoolRouter.route("/").get(AC.getSchools).post(AC.addSchool);

schoolRouter
  .route("/:id")
  .get(AC.getSchool)
  .put(AC.updateSchool)
  .delete(AC.deleteSchool);

schoolRouter.post(
  "/bulk",
  memoryUpload.single("school-file"),
  AC.bulkOpsSchool
);

// 3. Bus Routes
const busRouter = express.Router();

busRouter.route("/").get(AC.getBuses).post(AC.addBus);

busRouter.route("/:id").get(AC.getBus).put(AC.updateBus).delete(AC.deleteBus);

busRouter.post("/bulk", memoryUpload.single("bus-file"), AC.bulkOpsBus);

// 4. Student Routes
const studentRouter = express.Router();

studentRouter
  .route("/")
  .get(AC.getStudents)
  .post(studentPhotoUpload.single("photo"), AC.addStudent);

studentRouter
  .route("/:id")
  .get(AC.getStudent)
  .put(AC.updateStudent)
  .delete(AC.deleteStudent);

studentRouter.post(
  "/bulk",
  studentBulkImportUpload.single("import"),
  AC.bulkOpsStudent
);

studentRouter
  .route("/pik-loc/:id")
  .post(AC.addPickupLocation)
  .delete(AC.removePickupLocation);

adminRouter.use("/user", userRouter);
adminRouter.use("/school", schoolRouter);
adminRouter.use("/bus", busRouter);
adminRouter.use("/student", studentRouter);

module.exports = adminRouter;
