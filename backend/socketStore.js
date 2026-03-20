// Central in-memory store for online driver socket ids
// Export a plain object so other modules can read/write the same reference
const onlineDrivers = {};

module.exports = onlineDrivers;
