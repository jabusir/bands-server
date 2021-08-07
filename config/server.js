require("dotenv").config();

module.exports = ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", process.env.STRAPI_PORT),
  admin: {
    auth: {
      secret: env("ADMIN_JWT_SECRET", process.env.JWT_KEY),
    },
  },
});
