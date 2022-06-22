import _ from 'lodash';
import * as ss from 'simple-statistics'
import moment from 'moment';

import * as bs from './blackAndScholes';

export const formatData = (apiData, endOfDayData) => {
  const insideData = _.get(apiData, 'data.data');
  const grouped = _.groupBy(insideData, (datum) => {
    const ticker = _.get(datum, 'liveData.ticker', '');
    const type = ticker.slice(-2);
    return type;
  });

  const niftyPrice = {};
  // let latestTime;
  _.forEach(grouped, (optionTypeData, optionType) => {
    const groupedByStrike = _.groupBy(optionTypeData, 'liveData.strike');
    _.forEach(groupedByStrike, (strikeData, strike) => {
      groupedByStrike[strike] = _.keyBy(strikeData, 'liveData.time');
      // let lastTime;
      _.forEach(strikeData, (item) => {
      
        //moment('2022-06-22T09:57:02.987Z').format("hh:mm:ss")
        const time = moment(item.createdAt).utcOffset('+05:30').format("HH:mm:ss")
        if (!niftyPrice[time]) {
          // if (latestTime) {
          //   const  diff = moment(latestTime).diff(moment(item.liveData?.time))
          // }
          niftyPrice[time] = item.liveData?.niftyPrice;
        }
        const diff = Number(item.liveData.niftyPrice) - Number(strike);
        let premium;
        if (optionType === 'CE') {
          premium = item.liveData.price - diff;
        } else if(optionType === 'PE') {
          premium = item.liveData.price + diff;
        }



        item.endOfDayOi = _.get(endOfDayData, `strikeVsOi.${strike}`, 0);

        item.premium = premium;
        item.formattedTime = time;

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
         index,
         inputKey
        )
      );
  });
}

const calculateCoiByCv = (a, b, arr, index) => {
  const item = arr[index];
  return (Math.abs(item.liveData.oi - item.endOfDayOi))/item.liveData.volume;
};

// vol[roc] + pr decay - coi/v - iv[roc] 
// Roc iv 40%
// coi/v 20%
// pr decay: 25% [premium on option price not price]
// vol[roc]: 15%
const calculateScore = (a, b, arr, index) => {
  const item = arr[index];
  return (0.15*item.ndVolume - 0.25*item.nPremium - 0.4*item.ndIv - 0.2*item.nCoiByCv);

  // return (100 - 0.25*item.nPremium - 0.4*item.ndIv - 0.2*item.nCoiByCv);

}

const calculateDelta = (a, b, arr, index, inputKey) => {
  const item = arr[index];
  const prev = _.last(b) || {};
  return (_.get(item, inputKey, 0) - _.get(prev, inputKey, 0));
};

export const processOption = (formattedData)=> {
 const { CE, PE, CE_ARR, PE_ARR, NIFTY } = formattedData;

 const score = {};

 _.forEach(CE_ARR, (strikeData, strike) => {
  //  calculateCascading(strikeData, 'liveData.oi', 'logOi', Math.log);
   calculateCascading(strikeData, 'liveData.price', 'nPrice', normalise);
   calculateCascading(strikeData, 'liveData.volume', 'dVolume', calculateDelta);
   calculateCascading(strikeData, 'premium', 'dPremium', calculateDelta);
  //  calculateCascading(strikeData, 'dPremium', 'ndPremium', normalise);

   calculateCascading(strikeData, 'liveData.calculatedIv', 'dIv', normalise);
   calculateCascading(strikeData, 'dVolume', 'ndVolume', normalise);
   calculateCascading(strikeData, 'dIv', 'ndIv', normalise);

   calculateCascading(strikeData, null, 'nCoiByCv', calculateCoiByCv);
   calculateCascading(strikeData, 'liveData.calculatedIv', 'nIv', normalise);
   calculateCascading(strikeData, 'premium', 'nPremium', normalise);

   calculateCascading(strikeData, null, 'score', calculateScore);
 });

 _.forEach(PE_ARR, (strikeData, strike) => {
  // calculateCascading(strikeData, 'liveData.oi', 'logOi', Math.log);
  calculateCascading(strikeData, 'liveData.price', 'nPrice', normalise);
  calculateCascading(strikeData, 'liveData.volume', 'dVolume', calculateDelta);
  calculateCascading(strikeData, 'premium', 'dPremium', calculateDelta);
  // calculateCascading(strikeData, 'dPremium', 'ndPremium', normalise);

  calculateCascading(strikeData, 'liveData.calculatedIv', 'dIv', normalise);
  calculateCascading(strikeData, 'dVolume', 'ndVolume', normalise);
  calculateCascading(strikeData, 'dIv', 'ndIv', normalise);

  calculateCascading(strikeData, null, 'nCoiByCv', calculateCoiByCv);
  calculateCascading(strikeData, 'liveData.calculatedIv', 'nIv', normalise);
  calculateCascading(strikeData, 'premium', 'nPremium', normalise);

  calculateCascading(strikeData, null, 'score', calculateScore);
 });

 let _oldStrikes = [];

 _.forEach(NIFTY, (price, time) => {
  
    const strikes = getStrikes(price);

    // if (_.isEqual(_oldStrikes, strikes)) {
    //   return;
    // }

    _oldStrikes= strikes;

    let ceScore = 0;
    let peScore = 0;

    _.forEach(strikes, (strike) => {
      const ceArr = CE_ARR[strike];
      ceScore = _.reduce(ceArr, (acc, item) => {
        const itemTime = item.formattedTime;
        if (itemTime > time) return acc;
        return item.score + acc;
      }, ceScore);
      const peArr = PE_ARR[strike];
      peScore = _.reduce(peArr, (acc, item) => {
        const itemTime = item.formattedTime;
        if (itemTime > time) return acc;
        return item.score + acc;
      }, peScore);
    });
    score[time] = (peScore - ceScore) + (score[time] || 0);
 });

 const sortedTimeList = Object.keys(NIFTY).sort();

 formattedData.score = score;

 let coiCv = {};
 let moneyFlow = {};
 const iv = {};
 const premium = {};
 let oldStrikes = [];
 _.forEach(NIFTY, (price, time) => {
  const strikes = getStrikes(price);
  oldStrikes= strikes;
  
  if (!iv[time]) {
    iv[time] = {
      otmCallIv: 0,
      itmCallIv: 0,
      otmPutIv: 0,
      itmPutIv: 0, 
    }
  }

  if (!premium[time]) {
     premium[time] = {
      otmCallPremium: 0,
      itmCallPremium: 0,
      otmPutPremium: 0,
      itmPutPremium: 0, 
     }
  }
  if (!coiCv[time]) {
    coiCv[time] = {
      otmCallCoiCv: 0,
      itmCallCoiCv: 0,
      otmPutCoiCv: 0,
      itmPutCoiCv: 0, 
    }
  }

  if (!moneyFlow[time]) {
   moneyFlow[time] = { 
    otmCallMoneyFlow: 0,
    itmCallMoneyFlow: 0,
    otmPutMoneyFlow: 0,
    itmPutMoneyFlow: 0, 
  };
}

  let { otmCallCoiCv, itmCallCoiCv, otmPutCoiCv, itmPutCoiCv } = coiCv[time];
  let { otmCallMoneyFlow, itmCallMoneyFlow, otmPutMoneyFlow, itmPutMoneyFlow } = moneyFlow[time];
  let { otmCallIv, itmCallIv, otmPutIv, itmPutIv } = iv[time];
  let { otmCallPremium, itmCallPremium, otmPutPremium, itmPutPremium } = premium[time]

  _.forEach(strikes, (strike) => {
    const ceArr = CE_ARR[strike];
    const niftyPrice = price;

    // TODO: atm is added twice
    _.forEach(ceArr, (item) => {
      const itemTime = item.formattedTime;
      if (itemTime > time) return;
      const moneyflow = item.liveData.price*item.dVolume;
      const iv = item.nIv;
      const premium = item.nPremium;

      if ((strike < niftyPrice) || (Math.abs(niftyPrice - strike) <= 50)) {
        itmCallCoiCv += item.nCoiByCv;
        itmCallMoneyFlow += moneyflow;
        itmCallIv += iv;
        itmCallPremium += premium; 
      } else if (strike > niftyPrice || (Math.abs(niftyPrice - strike) <= 50) ) {
        otmCallCoiCv += item.nCoiByCv;
        otmCallMoneyFlow += moneyflow;
        otmCallIv += iv;
        otmCallPremium += premium;
      }
    });

    const peArr = PE_ARR[strike];

    _.forEach(peArr, (item) => {
      const itemTime = item.formattedTime;
      if (itemTime > time) return;
      const iv = item.nIv;
      const premium = item.nPremium;
      const moneyflow = item.liveData.price*item.dVolume;
      if ((strike > niftyPrice) || (Math.abs(niftyPrice - strike) <= 50)) {
        itmPutCoiCv += item.nCoiByCv;
        itmPutMoneyFlow += moneyflow;
        itmPutIv += iv;
        itmPutPremium += premium; 
      } else if (strike < niftyPrice || (Math.abs(niftyPrice - strike) <= 50) ) {
        otmPutCoiCv += item.nCoiByCv;
        otmPutMoneyFlow += moneyflow;
        otmPutIv += iv;
        otmPutPremium += premium; 
      }
    });

    coiCv[time] = {
      otmCallCoiCv, 
      itmCallCoiCv, 
      otmPutCoiCv,
      itmPutCoiCv
    };

    moneyFlow[time] = {
      otmCallMoneyFlow, 
      itmCallMoneyFlow, 
      otmPutMoneyFlow, 
      itmPutMoneyFlow
    };

    iv[time] = {
      otmCallIv,
      itmCallIv,
      otmPutIv,
      itmPutIv, 
    };

    premium[time] = {
      otmCallPremium,
      itmCallPremium,
      otmPutPremium,
      itmPutPremium, 
    };
  });

});

// formattedData.coiCv = coiCv;
// formattedData.moneyFlow = moneyFlow;


let coiCvArray = [];
let moneyFlowArray = [];
const ivArray = [];
const premiumArray = [];
_.forEach(sortedTimeList, (time) => {
  const coiCvValue = coiCv[time];
  const moneyFlowValue = moneyFlow[time];
  const premiumValue = premium[time];
  const ivValue = iv[time];
  coiCvArray.push({
    time,
    coiCvValue,
  });
  moneyFlowArray.push({
    time,
    moneyFlowValue
  });
  ivArray.push({
    time,
    ivValue
  });
  premiumArray.push({
    time,
    premiumValue
  })
});

  calculateCascading(coiCvArray, 'coiCvValue.otmCallCoiCv', 'coiCvValue.nOtmCallCoiCv', normalise);
  calculateCascading(coiCvArray, 'coiCvValue.itmCallCoiCv', 'coiCvValue.nItmCallCoiCv', normalise);
  calculateCascading(coiCvArray, 'coiCvValue.otmPutCoiCv', 'coiCvValue.nOtmPutCoiCv', normalise);
  calculateCascading(coiCvArray, 'coiCvValue.itmPutCoiCv', 'coiCvValue.nItmPutCoiCv', normalise);

  calculateCascading(moneyFlowArray, 'moneyFlowValue.otmCallMoneyFlow', 'moneyFlowValue.nOtmCallMoneyFlow', normalise);
  calculateCascading(moneyFlowArray, 'moneyFlowValue.itmCallMoneyFlow', 'moneyFlowValue.nItmCallMoneyFlow', normalise);
  calculateCascading(moneyFlowArray, 'moneyFlowValue.otmPutMoneyFlow', 'moneyFlowValue.nOtmPutMoneyFlow', normalise);
  calculateCascading(moneyFlowArray, 'moneyFlowValue.itmPutMoneyFlow', 'moneyFlowValue.nItmPutMoneyFlow', normalise);

  calculateCascading(premiumArray, 'premiumValue.otmCallPremium', 'premiumValue.nOtmCallPremium', normalise);
  calculateCascading(premiumArray, 'premiumValue.itmCallPremium', 'premiumValue.nItmCallPremium', normalise);
  calculateCascading(premiumArray, 'premiumValue.otmPutPremium', 'premiumValue.nOtmPutPremium', normalise);
  calculateCascading(premiumArray, 'premiumValue.itmPutPremium', 'premiumValue.nItmPutPremium', normalise);

  calculateCascading(ivArray, 'ivValue.otmCallIv', 'ivValue.nOtmCallIv', normalise);
  calculateCascading(ivArray, 'ivValue.itmCallIv', 'ivValue.nItmCallIv', normalise);
  calculateCascading(ivArray, 'ivValue.otmPutIv', 'ivValue.nOtmPutIv', normalise);
  calculateCascading(ivArray, 'ivValue.itmPutIv', 'ivValue.nItmPutIv', normalise);

  formattedData.coiCvArray = coiCvArray;
  formattedData.moneyFlowArray = moneyFlowArray;
  formattedData.ivArray = ivArray;
  formattedData.premiumArray = premiumArray;
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