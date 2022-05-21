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

const insertLiveData = async (userBody) => {
  console.log('userBody', userBody);
  return Option.insertMany(userBody);
};

const getData = async ({ start, end, type = 'option' }) => {
  return Option.find({ 'liveData.type': type, createdAt : { $gte: new Date(start), $lt: new Date(end) } }, { liveData: true, createdAt: true }).limit(40000);
};

module.exports = {
  insertData,
  getData,
  insertLiveData,
};
