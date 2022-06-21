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
        const diff = Number(item.niftyPrice) - Number(strike);
        let premium;
        if (optionType === 'CE') {
          premium = item.price - diff;
        } else if(optionType === 'PE') {
          premium = item.price + diff;
        }

        item.premium = premium;

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
  return item.liveData.oi/item.liveData.volume;
};

// vol[roc] + pr decay - coi/v - iv[roc] 
// Roc iv 40%
// coi/v 20%
// pr decay: 25% [premium on option price not price]
// vol[roc]: 15%
const calculateScore = (a, b, arr, index) => {
  const item = arr[index];
  return (0.15*item.ndVolume - 0.25*item.nPremium - 0.4*item.ndIv - 0.2*item.nCoiByCv);
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
   calculateCascading(strikeData, 'liveData.oi', 'logOi', Math.log);
   calculateCascading(strikeData, 'liveData.price', 'nPrice', normalise);
   calculateCascading(strikeData, 'liveData.volume', 'dVolume', calculateDelta);
   calculateCascading(strikeData, 'liveData.calculatedIv', 'dIv', normalise);
   calculateCascading(strikeData, 'dVolume', 'ndVolume', normalise);
   calculateCascading(strikeData, 'dIv', 'ndIv', normalise);

   calculateCascading(strikeData, null, 'nCoiByCv', calculateCoiByCv);
   calculateCascading(strikeData, 'liveData.calculatedIv', 'nIv', normalise);
   calculateCascading(strikeData, 'liveData.premium', 'nPremium', normalise);

   calculateCascading(strikeData, null, 'score', calculateScore);
 });

 _.forEach(PE_ARR, (strikeData, strike) => {
  calculateCascading(strikeData, 'liveData.oi', 'logOi', Math.log);
  calculateCascading(strikeData, 'liveData.price', 'nPrice', normalise);
  calculateCascading(strikeData, 'liveData.volume', 'dVolume', calculateDelta);
  calculateCascading(strikeData, 'liveData.calculatedIv', 'dIv', normalise);
  calculateCascading(strikeData, 'dVolume', 'ndVolume', normalise);
  calculateCascading(strikeData, 'dIv', 'ndIv', normalise);

  calculateCascading(strikeData, null, 'nCoiByCv', calculateCoiByCv);
  calculateCascading(strikeData, 'liveData.calculatedIv', 'nIv', normalise);
  calculateCascading(strikeData, 'liveData.premium', 'nPremium', normalise);

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
    score[time] = (peScore - ceScore) + (score[time] || 0);
 });
 formattedData.score = score;

 let coiCv = {};

 _.forEach(NIFTY, (price, time) => {
  const strikes = getStrikes(price);
  // let ceScore = 0;
  // let peScore = 0;

  if (!coiCv[time]) {
    coiCv[time] = {
      otmCallCoiCv: 0,
      itmCallCoiCv: 0,
      otmPutCoiCv: 0,
      itmPutCoiCv: 0, 
    }
  }
  const { otmCallCoiCv, itmCallCoiCv, otmPutCoiCv, itmPutCoiCv } = coiCv[time];

  _.forEach(strikes, (strike) => {
    const ceArr = CE_ARR[strike];
    const niftyPrice = price;

    // TODO: atm is added twice
    _.forEach(ceArr, (item) => {

      if ((strike < niftyPrice) || (Math.abs(niftyPrice - strike) <= 50)) {
        itmCallCoiCv += item.nCoiByCv;
      } else if (strike > niftyPrice || (Math.abs(niftyPrice - strike) <= 50) ) {
        otmCallCoiCv += item.nCoiByCv;
      }
    });

    const peArr = PE_ARR[strike];

    _.forEach(peArr, (item) => {
      if ((strike > niftyPrice) || (Math.abs(niftyPrice - strike) <= 50)) {
        itmPutCoiCv += item.nCoiByCv;
      } else if (strike < niftyPrice || (Math.abs(niftyPrice - strike) <= 50) ) {
        otmPutCoiCv += item.nCoiByCv;
      }
    });

    coiCv[time] = {
      otmCallCoiCv, 
      itmCallCoiCv, 
      otmPutCoiCv,
      itmPutCoiCv
    };
  });

});

formattedData.coiCv = coiCv;

//  console.log("Score", score);
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