import _ from 'lodash';
import * as ss from 'simple-statistics'
import * as bs from './blackAndScholes';

export const formatData = (apiData) => {
  const insideData = _.get(apiData, 'data.data');
  const grouped = _.groupBy(insideData, (datum) => {
    const ticker = _.get(datum, 'liveData.ticker', '');
    const type = ticker.slice(-2);
    return type;
  });

  const niftyPrice = {};

  _.forEach(grouped, (optionTypeData, optionType) => {
    const groupedByStrike = _.groupBy(optionTypeData, 'liveData.strike');
    _.forEach(groupedByStrike, (strikeData, strike) => {
      groupedByStrike[strike] = _.keyBy(strikeData, 'liveData.time')
      _.forEach(strikeData, (item) => {
        if (!niftyPrice[item.liveData?.time]) {
          niftyPrice[item.liveData?.time] = item.liveData?.niftyPrice;
        }

        if (!item.liveData.calculatedIv) {
          const t = bs.yearsFromExpiry(item.liveData?.expiry);
          const niftyPrice = item.liveData.niftyPrice;
          const callPut = bs.getCallPut(item.liveData.ticker);
          const o = item.liveData.price;
          
          const iv = bs.getIv(niftyPrice, item.liveData?.strike, t, o, callPut);

          // console.log({niftyPrice, strike: item.liveData?.strike, t, o, callPut, iv});
          _.set(item, 'liveData.calculatedIv', iv);
        }
      });
    });
    grouped[optionType] = groupedByStrike;
  });

  const { CE, PE } = grouped;

  grouped['CE_ARR'] = {};
  grouped['PE_ARR'] = {};
  grouped['NIFTY'] = niftyPrice;
  _.forEach(CE, (strikeData, strike) => {
    grouped['CE_ARR'][strike] = _.sortBy(Object.values(strikeData), 'liveData.time');
  });

  _.forEach(PE, (strikeData, strike) => {
    grouped['PE_ARR'][strike] = _.sortBy(Object.values(strikeData), 'liveData.time');
  });

  return grouped;
}

const normalise = (val, arr) => {
  const arrayToProcess = [val, ...arr];
  const mean = ss.mean(arrayToProcess);
  const sd = ss.standardDeviation(arrayToProcess);
  const a = ss.zScore(val, mean, sd);
  return a || 0;
};

const calculateCascading = (arr, inputKey, outputKey, callback) => {
  _.forEach(arr, (value, index) => {
    _.set(value, 
      outputKey,
       callback(
         _.get(value, inputKey, 0), 
         arr.slice(0, index).map((item) => _.get(item, inputKey, 0)), 
         arr, 
         index
        )
      );
  });
}

const calculateCoiByCv = (a, b, arr, index) => {
  const item = arr[index];
  return item.liveData.oi/item.liveData.volume;
};

const calculateScore = (a, b, arr, index) => {
  const item = arr[index];
  return (item.logOi - item.nPrice - item.nIv - item.nCoiByCv);
}

export const processOption = (formattedData)=> {
 const { CE, PE, CE_ARR, PE_ARR, NIFTY } = formattedData;

 const score = {};

 _.forEach(CE_ARR, (strikeData, strike) => {
   calculateCascading(strikeData, 'liveData.oi', 'logOi', Math.log);
   calculateCascading(strikeData, 'liveData.price', 'nPrice', normalise);
   calculateCascading(strikeData, null, 'nCoiByCv', calculateCoiByCv);
   calculateCascading(strikeData, 'liveData.calculatedIv', 'nIv', normalise);
   calculateCascading(strikeData, null, 'score', calculateScore);
 });

 _.forEach(PE_ARR, (strikeData, strike) => {
  calculateCascading(strikeData, 'liveData.oi', 'logOi', Math.log);
  calculateCascading(strikeData, 'liveData.price', 'nPrice', normalise);
  calculateCascading(strikeData, null, 'nCoiByCv', calculateCoiByCv);
  calculateCascading(strikeData, 'liveData.calculatedIv', 'nIv', normalise);
  calculateCascading(strikeData, null, 'score', calculateScore);
 });

 _.forEach(NIFTY, (price, time) => {
    const strikes = getStrikes(price);
    let ceScore = 0;
    let peScore = 0;

    _.forEach(strikes, (strike) => {
      const ceArr = CE_ARR[strike];
      ceScore = _.reduce(ceArr, (acc, item) => {
        return item.score + acc;
      }, ceScore);
      const peArr = PE_ARR[strike];
      peScore = _.reduce(peArr, (acc, item) => {
        return item.score + acc;
      }, peScore);
    });

    score[time] = peScore - ceScore;
 });

 console.log("Score", score);
}

const getStrikes = (assetPrice, interval = 50) => {
 const mod = assetPrice%interval;
 const atTheMoney = assetPrice - mod;
 const spread = 2;
 let strikes = [atTheMoney];
 let i = spread;
 while(i) {
  strikes = [...strikes, atTheMoney + i*interval, atTheMoney - i*interval];
  i--;
 }
 return strikes;
};