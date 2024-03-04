const Bus = require("../models/busModel");
const UnusedDevice = require("../models/unusedDeviceModel");
const { getAngle, getLenBtwPointsInKm, writeLog } = require("../utils/common");
const { isAlphaNumeric } = require("../utils/validators");
const { checkAttendance } = require("./attendance");

const insert_db_loc = async (loc) => {
  // Format Data
  loc.imei = loc.imei.trim().toUpperCase();
  loc.loc_valid = loc.loc_valid === "1";
  loc.lat = parseFloat(parseFloat(loc.lat).toFixed(6));
  loc.lon = parseFloat(parseFloat(loc.lon).toFixed(6));
  loc.altitude = Math.floor(loc.altitude);
  loc.angle = Math.floor(loc.angle);
  loc.speed = Math.floor(loc.speed);
  loc.protocol = loc.protocol.toLowerCase();
  loc.net_protocol = loc.net_protocol.toLowerCase();
  loc.dt_tracker = new Date(loc.dt_tracker.replace(" ", "T") + "Z");

  // check for wrong IMEI
  if (!isAlphaNumeric(loc.imei)) return false;

  // check for wrong speed
  if (loc.speed > 1000) return false;

  // check if device exists in system
  if (!(await Bus.any({ "device.imei": loc.imei }))) {
    await insert_db_unused(loc);
    return false;
  }

  // apply GPS Roll Over fix
  const now = new Date();
  if (
    loc.dt_tracker.getUTCFullYear() > now.getUTCFullYear() + 10 ||
    loc.dt_tracker.getUTCFullYear() < now.getUTCFullYear() - 10
  ) {
    if (
      loc.dt_tracker.getUTCMonth() === now.getUTCMonth() &&
      loc.dt_tracker.getUTCDate() === now.getUTCDate()
    ) {
      loc.dt_tracker.setUTCFullYear(now.getUTCFullYear());
    } else {
      loc.dt_tracker = new Date(now);
    }
  }

  // check if dt_tracker is one day too far - skip coordinate
  if (loc.dt_tracker >= new Date(now.getTime() + 86400000)) {
    return false;
  }

  // check if dt_tracker is at least one hour too far - set 0 UTC time
  if (loc.dt_tracker >= new Date(now.getTime() + 3600000)) {
    loc.dt_tracker = new Date(now);
  }

  // adjust GPS time
  // loc.dt_tracker = await adjustDeviceTime(loc.imei, loc.dt_tracker);

  // get previous known location
  let locPrev = await getDeviceData(loc.imei);

  // forward loc data
  // if (locPrev.forward_loc_data && locPrev.forward_loc_data_imei != "") {
  //   if (!(await Bus.any({ imei: locPrev.forward_loc_data_imei }))) {
  //     return false;
  //   }

  //   loc.imei = locPrev.forward_loc_data_imei;
  //   locPrev = await getDeviceData(loc.imei);
  // }

  // avoid incorrect lat and lon signs
  if (loc.lat != locPrev.lat) {
    if (Math.abs(loc.lat) === Math.abs(locPrev.lat)) {
      return false;
    }
  }

  if (loc.lon != locPrev.lon) {
    if (Math.abs(loc.lon) === Math.abs(locPrev.lon)) {
      return false;
    }
  }

  // Fetch device data
  const device = await Bus.findOne({ "device.imei": loc.imei })
    // .select("sensors odometer engine_hours")
    // .populate("sensors")
    .lean();

  // merge params only if dt_tracker is newer
  // if (loc.dt_tracker >= locPrev.dt_tracker) {
  //   loc.params = { ...locPrev.params, ...loc.params };
  // }

  // accvirt
  // if (locPrev.accvirt) {
  //   let accvirt_cn;
  //   try {
  //     accvirt_cn = JSON.parse(locPrev.accvirt_cn);
  //   } catch (error) {
  //     accvirt_cn = null;
  //   }
  //   if (accvirt_cn) {
  //     let cn_1 = false,
  //       cn_0 = false;

  //     // check if param exits
  //     if (loc.params[accvirt_cn.param]) {
  //       if (accvirt_cn.accvirt_1_cn === "eq") {
  //         if (loc.params[accvirt_cn.param] === accvirt_cn.accvirt_1_val)
  //           cn_1 = true;
  //       } else if (accvirt_cn.accvirt_1_cn === "gr") {
  //         if (loc.params[accvirt_cn.param] > accvirt_cn.accvirt_1_val)
  //           cn_1 = true;
  //       } else if (accvirt_cn.accvirt_1_cn === "lw") {
  //         if (loc.params[accvirt_cn.param] < accvirt_cn.accvirt_1_val)
  //           cn_1 = true;
  //       }

  //       if (accvirt_cn.accvirt_0_cn === "eq") {
  //         if (loc.params[accvirt_cn.param] === accvirt_cn.accvirt_0_val)
  //           cn_0 = true;
  //       } else if (accvirt_cn.accvirt_0_cn === "gr") {
  //         if (loc.params[accvirt_cn.param] > accvirt_cn.accvirt_0_val)
  //           cn_0 = true;
  //       } else if (accvirt_cn.accvirt_0_cn === "lw") {
  //         if (loc.params[accvirt_cn.param] < accvirt_cn.accvirt_0_val)
  //           cn_0 = true;
  //       }

  //       if (cn_1 && !cn_0) {
  //         loc.params.accvirt = "1";
  //       } else if (!cn_1 && cn_0) {
  //         loc.params.accvirt = "0";
  //       }
  //     }
  //   }
  // } else delete loc.params.accvirt;

  // sort params array
  loc.params = Object.keys(loc.params)
    .sort()
    .reduce((obj, key) => {
      obj[key] = loc.params[key];
      return obj;
    }, {});

  // check if location without valid lat and lon
  if (!loc.loc_valid && (loc.lat === 0 || loc.lon === 0)) {
    if (loc.dt_tracker >= locPrev.dt_tracker) {
      // add previous known location
      loc.lat = locPrev.lat;
      loc.lon = locPrev.lon;
      loc.altitude = locPrev.altitude;
      loc.angle = locPrev.angle;
      loc.speed = 0;
    }
  }

  // insert data into various services
  await updateDeviceLocData(loc, locPrev);

  // check for duplicate locations
  if (locFilter(loc, locPrev)) return;

  if (loc.lat == 0 || loc.lon == 0) return;

  if (loc.dt_tracker < locPrev.dt_tracker) return;

  writeLog("insert", `${loc.imei}: ${loc.params}`);
  if (!loc.params.io78) return;

  await checkAttendance(loc);
};

const insert_db_unused = async (loc) => {
  const exists = await UnusedDevice.any({ "device.imei": loc.imei });
  let result;
  if (!exists) {
    result = await UnusedDevice.create({
      imei: loc.imei,
      protocol: loc.protocol,
      net_protocol: loc.net_protocol,
      ip: loc.ip,
      port: loc.port,
      dt_server: loc.dt_server,
      count: 1,
    });
  } else {
    result = await UnusedDevice.updateOne(
      { "device.imei": loc.imei },
      {
        $set: {
          protocol: loc.protocol,
          net_protocol: loc.net_protocol,
          ip: loc.ip,
          port: loc.port,
          dt_server: loc.dt_server,
        },
        $inc: {
          count: 1,
        },
      }
    );
  }
  return result;
};

const updateDeviceLocData = async (loc, locPrev) => {
  let res;

  if (loc.dt_tracker >= locPrev.dt_tracker) {
    if (loc.loc_valid) {
      // Calculate angle
      if (loc.angle === 0) {
        loc.angle = getAngle(locPrev.lat, locPrev.lon, loc.lat, loc.lon);
      }

      res = await Bus.updateOne(
        { "device.imei": loc.imei },
        {
          $set: {
            "device.protocol": loc.protocol,
            "device.net_protocol": loc.net_protocol,
            "device.ip": loc.ip,
            "device.port": loc.port,
            "device.dt_server": loc.dt_server,
            "device.dt_tracker": loc.dt_tracker,
            "device.lat": loc.lat,
            "device.lon": loc.lon,
            "device.altitude": loc.altitude,
            "device.angle": loc.angle,
            "device.speed": loc.speed,
            "device.loc_valid": true,
            "device.params": loc.params,
          },
        }
      );
    } else {
      loc.speed = 0;
      if (loc.lat !== 0 && loc.lon !== 0) {
        res = await Bus.updateOne(
          { "device.imei": loc.imei },
          {
            $set: {
              "device.protocol": loc.protocol,
              "device.net_protocol": loc.net_protocol,
              "device.ip": loc.ip,
              "device.port": loc.port,
              "device.dt_server": loc.dt_server,
              "device.dt_tracker": loc.dt_tracker,
              "device.lat": loc.lat,
              "device.lon": loc.lon,
              "device.altitude": loc.altitude,
              "device.angle": loc.angle,
              "device.speed": loc.speed,
              "device.loc_valid": false,
              "device.params": loc.params,
            },
          }
        );
      } else {
        res = await Bus.updateOne(
          { "device.imei": loc.imei },
          {
            $set: {
              "device.protocol": loc.protocol,
              "device.net_protocol": loc.net_protocol,
              "device.ip": loc.ip,
              "device.port": loc.port,
              "device.dt_server": loc.dt_server,
              "device.dt_tracker": loc.dt_tracker,
              "device.speed": loc.speed,
              "device.loc_valid": false,
              "device.params": loc.params,
            },
          }
        );
      }
    }
  } else {
    res = await Bus.updateOne(
      { "device.imei": loc.imei },
      {
        $set: {
          "device.protocol": loc.protocol,
          "device.net_protocol": loc.net_protocol,
          "device.ip": loc.ip,
          "device.port": loc.port,
          "device.dt_server": loc.dt_server,
        },
      }
    );
  }

  return res;
};

const getDeviceData = async (imei) => {
  const bus = await Bus.findOne({ "device.imei": imei })
    .select("device")
    .lean();

  if (!bus || !bus.device) return false;

  // Format Data
  bus.device.lat = parseFloat(bus.device.lat);
  bus.device.lon = parseFloat(bus.device.lon);
  bus.device.params = bus.device.params || {};
  return bus.device;
};

const locFilter = (loc, locPrev) => {
  if (!process.env.LOCATION_FILTER === "true") return false;

  if (!loc.lat || !loc.lon || !loc.params) return false;

  if (loc.event !== "" || locPrev.params !== loc.params) return false;

  const dt_difference = Math.abs(
    new Date(loc.dt_server) - new Date(locPrev.dt_server)
  );

  if (dt_difference >= 120000) return false;

  // skip same location
  if (
    locPrev.lat == loc.lat &&
    locPrev.lon == loc.lon &&
    locPrev.speed == loc.speed
  ) {
    return true;
  }

  // skip drift
  distance = getLenBtwPointsInKm(locPrev.lat, locPrev.lon, loc.lat, loc.lon);

  if (
    dt_difference < 30000 &&
    distance < 0.01 &&
    loc.speed < 3 &&
    locPrev.speed == 0
  ) {
    return true;
  }

  return false;
};

module.exports = {
  insert_db_loc,
};
