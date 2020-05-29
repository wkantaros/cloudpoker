// make redis client available to all other modules, avoiding circular dependencies.
const redis = require("redis");
module.exports.client = redis.createClient();
