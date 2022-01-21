const Pool = require("pg").Pool;
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
module.exports = new Pool({
    user: process.env.USER,
    password: process.env.PASSWORD,
    host: process.env.HOST,
    port: process.env.PSQLPORT,
    database: process.env.DATABASE,
});
//# sourceMappingURL=db.js.map