const Attendance = require("../models/attendanceModel");
const Bus = require("../models/busModel");
const Student = require("../models/studentModel");
const C = require("../constants");
const {
  isPointInCircle,
  convUTCTo0530,
  getStudentName,
  formatDateToAMPM,
} = require("../utils/common");

const { notifyPushQueue } = require("../tools/notifyPush");

const checkAttendance = async (loc) => {
  try {
    const student = await Student.findOne({ rfid: loc.params.rfid })
      .select({
        name: 1,
        phone: 1,
        email: 1,
        admissionNo: 1,
        school: 1,
        bus: 1,
        pickupLocations: 1,
      })
      .populate({ path: "bus", select: "_id name status alternate" })
      .populate({ path: "school", select: "lat lon radius address timings" });

    if (!student) return false;

    // Check if attendance already taken

    let isMEntryTaken = false;
    let isMExitTaken = false;
    let isAEntryTaken = false;
    let isAExitTaken = false;

    loc.today = new Date(loc.dt_tracker).setUTCHours(0, 0, 0, 0);
    // Today's attendance
    const TA = await Attendance.findOne({
      date: loc.today,
      student: student._id,
    })
      .select("list")
      .lean();

    if (TA) {
      const list = TA.list;

      if (list.find((ele) => ele.tag === C.M_ENTRY)) isMEntryTaken = true;
      if (list.find((ele) => ele.tag === C.M_EXIT)) isMExitTaken = true;
      if (list.find((ele) => ele.tag === C.A_ENTRY)) isAEntryTaken = true;
      if (list.find((ele) => ele.tag === C.A_EXIT)) isAExitTaken = true;
    }

    if (!isMEntryTaken) {
      // 1. Check for bus boarding attendance (at pickup location)
      let isAttendanceTaken = await checkMorningEntryAttendance(loc, student);
    } else if (!isMExitTaken) {
      // 2. Check for bus leaving attendance (at school's location)
      let isAttendanceTaken = await checkMorningExitAttendance(loc, student);
    } else if (!isAEntryTaken) {
      // 3. Check for bus boarding attendance (at school's location)
      let isAttendanceTaken = await checkAfternoonEntryAttendance(loc, student);
    } else if (!isAExitTaken) {
      // 2. Check for bus leaving attendance (at school's location)
      let isAttendanceTaken = await checkAfternoonExitAttendance(loc, student);
    }
  } catch (err) {
    console.log(err);
  }
};

const checkMorningEntryAttendance = async (loc, student) => {
  const morningTime = student.school.timings.morning;

  if (!isMorningTime(loc.dt_tracker, morningTime)) return false;

  for (const pl of student.pickupLocations) {
    if (isPointInCircle(loc.lat, loc.lon, pl.lat, pl.lon, pl.radius)) {
      await takeAttendance(loc, student, C.M_ENTRY, pl.address);
      return true;
    }
  }

  return false;
};

const checkMorningExitAttendance = async (loc, student) => {
  const morningTime = student.school.timings.morning;

  if (!isMorningTime(loc.dt_tracker, morningTime)) return false;

  const skul = student.school;

  if (isPointInCircle(loc.lat, loc.lon, skul.lat, skul.lon, skul.radius)) {
    await takeAttendance(loc, student, C.M_EXIT, skul.address);
    return true;
  }

  return false;
};

const checkAfternoonEntryAttendance = async (loc, student) => {
  const afternoonTime = student.school.timings.afternoon;

  if (!isAfternoonTime(loc.dt_tracker, afternoonTime)) return false;

  const skul = student.school;

  if (isPointInCircle(loc.lat, loc.lon, skul.lat, skul.lon, skul.radius)) {
    await takeAttendance(loc, student, C.A_ENTRY, skul.address);
    return true;
  }

  return false;
};

const checkAfternoonExitAttendance = async (loc, student) => {
  const afternoonTime = student.school.timings.afternoon;

  if (!isAfternoonTime(loc.dt_tracker, afternoonTime)) return false;

  for (const pl of student.pickupLocations) {
    if (isPointInCircle(loc.lat, loc.lon, pl.lat, pl.lon, pl.radius)) {
      await takeAttendance(loc, student, C.A_EXIT, pl.address);
      return true;
    }
  }

  return false;
};

const isMorningTime = (currDT, morningTime) => {
  currDT = new Date(currDT);
  morningTime = morningTime.split(":").map((e) => parseInt(e));

  return (
    currDT.getUTCHours() < morningTime[0] &&
    currDT.getUTCMinutes() < morningTime[1]
  );
};

const isAfternoonTime = (currDT, afternoonTime) => {
  currDT = new Date(currDT);
  afternoonTime = afternoonTime.split(":").map((e) => parseInt(e));

  return (
    currDT.getUTCHours() < afternoonTime[0] &&
    currDT.getUTCMinutes() < afternoonTime[1]
  );
};

const takeAttendance = async (loc, student, tag, address) => {
  const bus = await Bus.findOne({ "device.imei": loc.imei })
    .select("_id name")
    .lean();

  const attendanceDetail = {
    tag,
    time: loc.dt_tracker,
    lat: loc.lat,
    lon: loc.lon,
    address,
  };

  if (!(await Attendance.any({ date: loc.today, student: student._id }))) {
    const attendance = await Attendance.create({
      date: loc.today,
      student: student._id,
      bus: bus._id,
      list: [attendanceDetail],
    });
  } else {
    const result = await Attendance.updateOne(
      { date: loc.today, student: student._id },
      {
        $set: { bus: bus._id },
        $push: { list: attendanceDetail },
      }
    );
  }

  const sName = getStudentName(student.name);
  const bName = bus.name;
  const dt = formatDateToAMPM(convUTCTo0530(loc.dt_tracker));
  let msg = "";

  if (tag === C.M_ENTRY) {
    msg = `[${dt}]: ${sName} has entered the bus ${bName} for school (${loc.lat}, ${loc.lon})`;

    // Different bus than assigned
    if (bus._id !== student.bus._id) {
      const altBus = await Bus.findById(student.bus.alternate)
        .select("name status")
        .lean();

      if (bus._id !== altBus) {
        msg = `[${dt}]: ${sName} has entered the wrong bus ${bName} for school (${loc.lat}, ${loc.lon})`;
      }
    }
  } else if (tag === C.M_EXIT) {
    msg = `[${dt}]: ${sName} has exited the bus ${bName} at school (${loc.lat}, ${loc.lon})`;
  } else if (tag === C.A_ENTRY) {
    msg = `[${dt}]: ${sName} has entered the bus ${bName} at school (${loc.lat}, ${loc.lon})`;

    // Different bus than assigned
    if (bus._id !== student.bus._id) {
      const altBus = await Bus.findById(student.bus.alternate)
        .select("name status")
        .lean();

      if (bus._id !== altBus) {
        msg = `[${dt}]: ${sName} has entered the wrong bus ${bName} at school (${loc.lat}, ${loc.lon})`;
      }
    }
  } else if (tag === C.A_EXIT) {
    msg = `[${dt}]: ${sName} has exited the bus ${bName} at pickup location (${loc.lat}, ${loc.lon})`;
  }

  await notifyPushQueue(msg, student._id);
};

module.exports = {
  checkAttendance,
};
