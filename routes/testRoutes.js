const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const Student = require("../models/studentModel");

router.get(
  "/1",
  asyncHandler(async (req, res) => {
    const _id = "65dedc2bad97177e84331d97";
    const student = await Student.findOne({ _id })
      .select({
        name: 1,
        phone: 1,
        email: 1,
        admissionNo: 1,
        school: 1,
        bus: 1,
        pickupLocations: 1,
      })
      .populate({ path: "bus", select: "_id" })
      .populate({ path: "school", select: "timings" });

    if (!student) return false;

    res.json(student);
  })
);

module.exports = router;
