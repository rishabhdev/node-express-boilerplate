const moment = require('moment');
const _ = require('lodash');
const expiryDates = require('./expiryDates');

const getStrikes = (assetPrice, interval = 50) => {
 const mod = assetPrice%interval;
 const atTheMoney = assetPrice - mod;
 const curr = moment().utcOffset("+05:30");
 const hrs = curr.hours();
 const mins = curr.minutes();

 let spread = 10;

 // Capture more data during the last minutes
 if (hrs === 15 && (mins > 25)) {
   spread = 18
 }

 let strikes = [atTheMoney];
 let i = spread;
 while(i) {
  strikes = [...strikes, atTheMoney + i*interval, atTheMoney - i*interval];
  i--;
 }
 return strikes;
};


const isLastExpiryOfMonth = (date) => {
  const month = moment(date).month();
  const nextMonth = moment(date).add(7, 'days').month();

  return month !== nextMonth;
}


const getOptionSymbols = (assetPrice) => {
  const strikes = getStrikes(assetPrice, 50);
  const currentDate = moment();
  const currentExpiryIndex = _.findIndex(expiryDates, (date) => moment(date, 'dddd, DD MMM, YYYY').isSameOrAfter(currentDate, 'day'));
  const nextExpiryIndex = currentExpiryIndex + 1;
  const currentExpiry = moment(expiryDates[currentExpiryIndex], 'dddd, DD MMM, YYYY');
  const nextExpiry = moment(expiryDates[nextExpiryIndex], 'dddd, DD MMM, YYYY');

  const yCurrentExpiry = currentExpiry.format('YY');
  const mCurrentExpiry = isLastExpiryOfMonth(currentExpiry) ? currentExpiry.format('MMM').toUpperCase() : currentExpiry.format('M');
  const dCurrentExpiry = isLastExpiryOfMonth(currentExpiry) ?  '' : currentExpiry.format('DD');
  const yNextExpiry = nextExpiry.format('YY');
  const mNextExpiry = isLastExpiryOfMonth(nextExpiry) ? nextExpiry.format('MMM').toUpperCase() : currentExpiry.format('M');
  const dNextExpiry = isLastExpiryOfMonth(nextExpiry) ? '' : nextExpiry.format('DD');
  const currentExpiryStrikesCE = strikes.map(strike => ({ type: 'CE', strike, symbol: `NIFTY${yCurrentExpiry}${mCurrentExpiry}${dCurrentExpiry}${strike}CE`, expiry: moment(expiryDates[currentExpiryIndex], 'dddd, DD MMM, YYYY').toISOString() }));
  const currentExpiryStrikesPE = strikes.map(strike => ({ type: 'PE', strike, symbol: `NIFTY${yCurrentExpiry}${mCurrentExpiry}${dCurrentExpiry}${strike}PE`, expiry: moment(expiryDates[currentExpiryIndex], 'dddd, DD MMM, YYYY').toISOString() }));
  const nextExpiryStrikesCE = strikes.map(strike => ({ type: 'CE', strike, symbol: `NIFTY${yNextExpiry}${mNextExpiry}${dNextExpiry}${strike}CE`, expiry: moment(expiryDates[nextExpiryIndex], 'dddd, DD MMM, YYYY').toISOString() }));
  const nextExpiryStrikesPE = strikes.map(strike => ({ type: 'PE', strike, symbol: `NIFTY${yNextExpiry}${mNextExpiry}${dNextExpiry}${strike}PE`, expiry: moment(expiryDates[nextExpiryIndex], 'dddd, DD MMM, YYYY').toISOString() }));
  return [...currentExpiryStrikesCE, ...currentExpiryStrikesPE, ...nextExpiryStrikesCE, ...nextExpiryStrikesPE];
}

module.exports = { getStrikes, getOptionSymbols }