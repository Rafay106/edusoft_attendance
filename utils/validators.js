const validator = require("validator");

// Check if n is a number or numric string
const isNumber = (n) => !isNaN(parseFloat(n)) && isFinite(n);

const isValidJSON = (text) => {
  if (typeof text !== "string") {
    return false;
  }
  try {
    var json = JSON.parse(text);
    return typeof json === "object";
  } catch (error) {
    return false;
  }
};

const isAlphaNumeric = (str) => {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (
      !(code > 47 && code < 58) && // numeric (0-9)
      !(code > 64 && code < 91) && // upper alpha (A-Z)
      !(code > 96 && code < 123) // lower alpha (a-z)
    ) {
      return false;
    }
  }
  return true;
};

const isIMEIValid = (imei) => {
  imei = String(imei);
  const regExp = /^[a-zA-Z0-9]{1,15}$/;
  if (imei.match(regExp)) return true;
  return false;
};

const isUsernameValid = (imei) => {
  const regExp = /^[A-Za-z][A-Za-z0-9_]{2,20}$/;
  if (imei.match(regExp)) return true;
  return false;
};

const timeValidator = (time) => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

module.exports = {
  isNumber,
  isValidJSON,
  isAlphaNumeric,
  isIMEIValid,
  isUsernameValid,
  isEmailValid: validator.isEmail,
  timeValidator,
};
