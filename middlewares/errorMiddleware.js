const errorHandler = (err, req, res, next) => {
  console.log("Custom Error Handler:", err);

  // if (process.env.NODE_ENV === "development") {
  //   devErrors(res, err);
  // } else if (process.env.NODE_ENV === "production") {
  //   if (err.name === "CastError") err = castErrorHandler(err);
  //   if (err.code === 11000) err = duplicateKeyErrorHandler(err)
  // }

  if (err.name === "ValidationError") {
    const message = Object.keys(err.errors).map((key) =>
      err.errors[key].message.replace("%F%", key)
    );

    return res.status(400).json({
      error: message,
    });
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    const message = Object.keys(err.keyValue).map(
      (key) => `${key}: ${err.keyValue[key]} already exists!`
    );
    return res.status(400).json({
      error: message,
    });
  }

  if (err.name === "BulkImportError") {
    err.message = err.message.split(",");
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const errMsg = err.message || "Something went wrong";

  res.status(statusCode).json({
    message: errMsg,
    stack: process.env.NODE_ENV === "production" ? null : err.stack.split("\n"),
  });
};

module.exports = { errorHandler };
