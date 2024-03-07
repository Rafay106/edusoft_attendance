const STRINGS = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  MANAGER: "manager",
  USER: "user",
  FIELD_IS_REQ: "%F% is required!",
  FIELD_IS_INVALID: "%F% is invalid!",
  VALUE_NOT_SUP: "{VALUE} is not supported!",
  VALUE_NOT_SUP_AT_IDX: "%V% is not supported at index: %I%",
  INVALID_CREDENTIALS: "Invalid Credentials!",
  RESOURSE_404: "%R% not found: %ID%",
  PAGE_LIMIT_REACHED: "Page limit reached!",
  FIELD_IS_REQ_AT_IDX: "%F% is required at index: %I%",
  FIELD_IS_INVALID_AT_IDX: "%F% is invalid at index: %I%",
  URL_404: "URL not found!",
  M_ENTRY: "Morning Entry",
  M_EXIT: "Morning Exit",
  A_ENTRY: "aEntry",
  A_EXIT: "aExit",
};

const FUNCTIONS = {
  isAdmin: (type) => [STRINGS.SUPERADMIN, STRINGS.ADMIN].includes(type),
  isManager: (type) => [STRINGS.MANAGER].includes(type),
  isUser: (type) => [STRINGS.USER].includes(type),
  getFieldIsReq: (field) => STRINGS.FIELD_IS_REQ.replace("%F%", field),
  getFieldIsInvalid: (field) => STRINGS.FIELD_IS_INVALID.replace("%F%", field),
  getValueNotSup: (val) => STRINGS.VALUE_NOT_SUP.replace("{VALUE}", val),
  getValueNotSupAtIdx: (val, idx) =>
    STRINGS.VALUE_NOT_SUP_AT_IDX.replace("%V%", val).replace("%I%", idx),
  getResourse404Error: (resource, id) => {
    return STRINGS.RESOURSE_404.replace("%R%", resource).replace("%ID%", id);
  },
  getFieldIsReqAtIdx: (field, idx) => {
    return STRINGS.FIELD_IS_REQ_AT_IDX.replace("%F%", field).replace(
      "%I%",
      idx
    );
  },
  getFieldIsInvalidAtIdx: (field, idx) => {
    return STRINGS.FIELD_IS_INVALID_AT_IDX.replace("%F%", field).replace(
      "%I%",
      idx
    );
  },
  getNotValid24HFormat: ({ value }) => {
    return `${value} is not a valid 24-hour time format (HH:MM)!`;
  },
};

module.exports = { ...STRINGS, ...FUNCTIONS };
