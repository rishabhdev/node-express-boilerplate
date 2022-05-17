const moment = require('moment');
const _ = require('lodash');
const expiryDates = require('./expiryDates');

const getStrikes = (assetPrice, interval = 50) => {
 const mod = assetPrice%interval;
 const atTheMoney = assetPrice - mod;
 const spread = 10;
 let strikes = [atTheMoney];
 let i = spread;
 while(i) {
  strikes = [...strikes, atTheMoney + i*interval, atTheMoney - i*interval];
  i--;
 }
 return strikes;
};


const getOptionSymbols = (assetPrice) => {
  const strikes = getStrikes(assetPrice, 50);
  const currentDate = moment();
  const currentExpiryIndex = _.findIndex(expiryDates, (date) => moment(date, 'dddd, DD MMM, YYYY').isAfter(currentDate));
  const nextExpiryIndex = currentExpiryIndex + 1;
  const currentExpiry = moment(expiryDates[currentExpiryIndex]);
  const nextExpiry = moment(expiryDates[nextExpiryIndex]);
  const yCurrentExpiry = currentExpiry.format('YY');
  const mCurrentExpiry = currentExpiry.format('M');
  const dCurrentExpiry = currentExpiry.format('DD');
  const yNextExpiry = nextExpiry.format('YY');
  const mNextExpiry = nextExpiry.format('M');
  const dNextExpiry = nextExpiry.format('DD');
  const currentExpiryStrikesCE = strikes.map(strike => ({ type: 'CE', strike, symbol: `NIFTY${yCurrentExpiry}${mCurrentExpiry}${dCurrentExpiry}${strike}CE`, expiry: expiryDates[currentExpiryIndex] }));
  const currentExpiryStrikesPE = strikes.map(strike => ({ type: 'PE', strike, symbol: `NIFTY${yCurrentExpiry}${mCurrentExpiry}${dCurrentExpiry}${strike}PE`, expiry: expiryDates[currentExpiryIndex] }));
  const nextExpiryStrikesCE = strikes.map(strike => ({ type: 'CE', strike, symbol: `NIFTY${yNextExpiry}${mNextExpiry}${dNextExpiry}${strike}CE`, expiry: expiryDates[nextExpiryIndex] }));
  const nextExpiryStrikesPE = strikes.map(strike => ({ type: 'PE', strike, symbol: `NIFTY${yNextExpiry}${mNextExpiry}${dNextExpiry}${strike}PE`, expiry: expiryDates[nextExpiryIndex] }));
  return [...currentExpiryStrikesCE, ...currentExpiryStrikesPE, ...nextExpiryStrikesCE, ...nextExpiryStrikesPE];
}

module.exports = { getStrikes, getOptionSymbols }