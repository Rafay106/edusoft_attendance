const jwt = require("jsonwebtoken");

const generateToken = (data) => {
  const expiresIn = String(15 * 1000);

  const payload = {
    ...data,
    iat: Math.floor(Date.now() / 1000),
  };

  const signedToken = jwt.sign(payload, process.env.SECRET); // , {expiredIn} );

  return {
    token: `Bearer ${signedToken}`,
    // expires: expiresIn,
  };
};

module.exports = {
  generateToken,
};
