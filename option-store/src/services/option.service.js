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

const getData = async ({ start, end, type = 'option', expiry }) => {
  const expiryQuery = expiry ? { 'liveData.expiry': { $eq: new Date(expiry).toISOString() } } : {}
  return Option.find({ 'liveData.type': type, ...expiryQuery, createdAt : { $gte: new Date(start), $lt: new Date(end) } }, { 
    'liveData.price': true, 
    'liveData.volume': true, 
    createdAt: true,
    'liveData.oi': true,
    'liveData.quantity': true,
    'liveData.greeks.iv': true,
    'liveData.time': true,
    'liveData.niftyPrice': true,
    'liveData.strike': true,
    'liveData.expiry': true,
    'liveData.ticker': true,
    'liveData.calculatedIv': true,
    'liveData.tickCount': true,
    'liveData.avgQuantityPerTick': true,
    'liveData.vWap': true,
  }).limit(80000);
};
module.exports = {
  insertData,
  getData,
  insertLiveData,
};
