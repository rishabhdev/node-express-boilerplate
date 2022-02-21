const httpStatus = require('http-status');
const { Option } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const insertData = async (userBody) => {
  return Option.create(userBody);
};

const getData = async ({ start, end }) => {
  return Option.find({ createdAt : { $gte: new Date(start), $lt: new Date(end) } }).limit(400);
};

module.exports = {
  insertData,
  getData,
};
