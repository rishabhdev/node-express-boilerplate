import React, { useEffect, useState } from 'react';
import axios from 'axios';
import _ from 'lodash';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { formatData, processOption } from '../utils/formatOption';

// TODO: add last day oi
// TODO: moneyflow of options
// TODO: future -plot premium
// moneflow for futures
// money flow for cash

const getOptionsData = async () => {
 const x =  await axios.post('http://18.234.100.126:3000/v1/options/getData', {
    "start": "2022-06-27T09:15:00.882+05:30",
     "end": "2022-06-27T15:30:00.413+05:30",
     "type": "option",
     "expiry": "2022-06-30T00:00:00.000Z"
 });

  // console.log('getOptionsData', x);
  return x;
}


const dayEndSummary = async () => {
  const x =  await axios.post('http://18.234.100.126:3000/v1/options/getData', {
    "start": "2022-06-24T15:25:00.882+05:30",
     "end": "2022-06-24T15:32:00.413+05:30",
     "type": "option",
     "expiry": "2022-06-30T00:00:00.000Z"
});
const prevDayData = _.sortBy(x.data.data, 'liveData.time');
const _dayEndSummary = { strikeVsOi: {}, strikeVsVolume: {}, strikeVsIv: {} };

_.forEach(prevDayData, (item) => {
  _dayEndSummary.strikeVsOi[item.liveData.strike] = item.liveData.oi;
  _dayEndSummary.strikeVsVolume[item.liveData.strike] = item.liveData.volume;
  _dayEndSummary.strikeVsIv[item.liveData.strike] = item.liveData.calculatedIv;
});

// console.log('dayEndSummary', x);
return _dayEndSummary;
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const options = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: 'Chart.js Line Chart',
    },
  },
};

const labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];

export const data = {
  labels,
  datasets: [
    {
      label: 'Dataset 1',
      data: [3,5,5,6,2,3,4,23,5,5,6],
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
    },
    {
      label: 'Dataset 2',
      data:  [2,3,4,23,5,5,6,3,5,5,6],
      borderColor: 'rgb(53, 162, 235)',
      backgroundColor: 'rgba(53, 162, 235, 0.5)',
    },
  ],
};

// const formatData = (apiData) => {
//   const insideData = _.get(apiData, 'data.data');
//   const grouped = _.groupBy(insideData, 'liveData.ticker');
//   const labels = _.keys(grouped);

// }

const prepareDataSets = (formattedData) => {
  const niftyScore = formattedData.score;
  const niftyScores = []
  const niftyTime = Object.keys(niftyScore).sort();
  _.forEach(niftyTime, (val) => {
    niftyScores.push(niftyScore[val]);
  });
  console.log('niftyTime', niftyTime);
  const oci = {
    labels: niftyTime,
    datasets: [{
      label: 'OCI',
      data: niftyScores,
    }]
  };

  const coiCvArray = formattedData.coiCvArray;
  const moneyFlowArray = formattedData.moneyFlowArray;
  const ivArray = formattedData.ivArray;
  const premiumArray = formattedData.premiumArray;
  const quantityPerTickArray = formattedData.quantityPerTickarray;
  const oiArray = formattedData.oiArray;
  const coiByCv = {
    labels: niftyTime,
    datasets: [{
      label: 'OTM CALL',
      data: _.map(coiCvArray, 'coiCvValue.nOtmCallCoiCv'),
      borderColor: '#bcaaa4'
    }, {
      label: 'ITM CALL',
      data: _.map(coiCvArray, 'coiCvValue.nItmCallCoiCv'),
      borderColor: '#f8bbd0'
    }, {
      label: 'OTM PUT',
      data: _.map(coiCvArray, 'coiCvValue.nOtmPutCoiCv'),
      borderColor: '#7986cb'
    }, {
      label: 'ITM PUT',
      data: _.map(coiCvArray, 'coiCvValue.nItmPutCoiCv'),
      borderColor: '#80deea'
    }]
  };

  const moneyFlow = {
    labels: niftyTime,
    datasets: [{
      label: 'OTM CALL',
      data: _.map(moneyFlowArray, 'moneyFlowValue.nOtmCallMoneyFlow'),
      borderColor: '#bcaaa4'

    }, {
      label: 'ITM CALL',
      data: _.map(moneyFlowArray, 'moneyFlowValue.nItmCallMoneyFlow'),
      borderColor: '#f8bbd0'
    }, {
      label: 'OTM PUT',
      data: _.map(moneyFlowArray, 'moneyFlowValue.nOtmPutMoneyFlow'),
      borderColor: '#7986cb'
    }, {
      label: 'ITM PUT',
      data: _.map(moneyFlowArray, 'moneyFlowValue.nItmPutMoneyFlow'),
      borderColor: '#80deea'
    }]
  };

  const premium = {
    labels: niftyTime,
    datasets: [{
      label: 'OTM CALL',
      data: _.map(premiumArray, 'premiumValue.nOtmCallPremium'),
      borderColor: '#bcaaa4'

    }, {
      label: 'ITM CALL',
      data: _.map(premiumArray, 'premiumValue.nItmCallPremium'),
      borderColor: '#f8bbd0'
    }, {
      label: 'OTM PUT',
      data: _.map(premiumArray, 'premiumValue.nOtmPutPremium'),
      borderColor: '#7986cb'
    }, {
      label: 'ITM PUT',
      data: _.map(premiumArray, 'premiumValue.nItmPutPremium'),
      borderColor: '#80deea'
    }]
  };
  // nOtmCallIv
  const iv = {
    labels: niftyTime,
    datasets: [{
      label: 'OTM CALL',
      data: _.map(ivArray, 'ivValue.nOtmCallIv'),
      borderColor: '#bcaaa4'

    }, {
      label: 'ITM CALL',
      data: _.map(ivArray, 'ivValue.nItmCallIv'),
      borderColor: '#f8bbd0'
    }, {
      label: 'OTM PUT',
      data: _.map(ivArray, 'ivValue.nOtmPutIv'),
      borderColor: '#7986cb'
    }, {
      label: 'ITM PUT',
      data: _.map(ivArray, 'ivValue.nItmPutIv'),
      borderColor: '#80deea'
    }]
  };

  const quantityPerTick = {
    labels: niftyTime,
    datasets: [{
      label: 'OTM CALL',
      data: _.map(quantityPerTickArray, 'quantityPerTickValue.otmCallQuantityPerTick'),
      borderColor: '#bcaaa4'

    }, {
      label: 'ITM CALL',
      data: _.map(quantityPerTickArray, 'quantityPerTickValue.itmCallQuantityPerTick'),
      borderColor: '#f8bbd0'
    }, {
      label: 'OTM PUT',
      data: _.map(quantityPerTickArray, 'quantityPerTickValue.otmPutQuantityPerTick'),
      borderColor: '#7986cb'
    }, {
      label: 'ITM PUT',
      data: _.map(quantityPerTickArray, 'quantityPerTickValue.itmPutQuantityPerTick'),
      borderColor: '#80deea'
    }]
  };

  const oi = {
    labels: niftyTime,
    datasets: [{
      label: 'OTM CALL',
      data: _.map(oiArray, 'oiValue.otmCallOi'),
      borderColor: '#bcaaa4'

    }, {
      label: 'ITM CALL',
      data: _.map(oiArray, 'oiValue.itmCallOi'),
      borderColor: '#f8bbd0'
    }, {
      label: 'OTM PUT',
      data: _.map(oiArray, 'oiValue.otmPutOi'),
      borderColor: '#7986cb'
    }, {
      label: 'ITM PUT',
      data: _.map(oiArray, 'oiValue.itmPutOi'),
      borderColor: '#80deea'
    }]
  };

  return {
    oci,
    coiByCv,
    moneyFlow,
    iv,
    premium,
    quantityPerTick,
    oi
  }

  // const 
  
}

function App() {
  const [_data, setData] = useState([]);
  const [dataSet, setDataSet] = useState([]);
  useEffect(() => {
    const a = async () => {
      const endOfDayData = await dayEndSummary();
      console.log("endOfDay", endOfDayData);
      const abc = await getOptionsData();
      const formattedData = formatData(abc, endOfDayData);
      processOption(formattedData);
      const dataSet = prepareDataSets(formattedData);
      console.log('dataSet', dataSet);
      setDataSet(dataSet);
      console.log("formattedData", formattedData);
      setData(abc);
    };
    a();
  }, [])

  return (
    <div>
      <h2>OCI</h2>
      {dataSet.oci && <Line options={options} data={dataSet.oci} />}
      <br />
      <h2>COI BY V</h2>
      {dataSet.coiByCv && <Line options={options} data={dataSet.coiByCv} />}
      <br />
      <h2>IV</h2>
      {dataSet.iv && <Line options={options} data={dataSet.iv} />}
      <br />
      <h2>Premium</h2>
      {dataSet.premium && <Line options={options} data={dataSet.premium} />}
      <br />
      <h2>Money flow</h2>
      {dataSet.moneyFlow && <Line options={options} data={dataSet.moneyFlow} />}

      <h2>Open Interest</h2>
      {dataSet.oi && <Line options={options} data={dataSet.oi} />}

      <h2>Quantity Per Tick</h2>
      {dataSet.quantityPerTick && <Line options={options} data={dataSet.quantityPerTick} />}
      <br />
    </div>
  )
  
}


export default App;