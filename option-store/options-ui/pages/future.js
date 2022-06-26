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

import { formatFuture } from '../utils/formatFuture';

// TODO: add last day oi
// TODO: moneyflow of options
// TODO: future -plot premium
// moneflow for futures
// money flow for cash

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

const getFutureData = async () => {
 const futureData =  await axios.post('http://18.234.100.126:3000/v1/options/getData', {
    "start": "2022-06-24T09:15:00.882+05:30",
     "end": "2022-06-24T15:30:00.413+05:30",
     "type": "future",
 });
 const indexData =  await axios.post('http://18.234.100.126:3000/v1/options/getData', {
  "start": "2022-06-24T09:15:00.882+05:30",
   "end": "2022-06-24T15:30:00.413+05:30",
   "type": "index",
});
  return { futureData: futureData.data.data, indexData: indexData.data.data };
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


const prepareDataSets = (formattedData) => {
  const timeList = _.map(formattedData, 'createdAt');
  console.log("formattedData", formattedData);
  const futureSpot = {
    labels: timeList,
    datasets: [{
      label: 'Nifty Spot',
      data: _.map(formattedData, 'niftyPrice'),
      borderColor: '#bcaaa4'

    }, {
      label: 'NIFTY Future',
      data: _.map(formattedData, 'liveData.price'),
      borderColor: '#f8bbd0'
    }]
  };

  const avgQuantityPerTick = {
    labels: timeList,
    datasets: [{
      label: 'Quantity Per Tick',
      data: _.map(formattedData, 'liveData.avgQuantityPerTick'),
      borderColor: '#bcaaa4'
    }]
  };

  const premium = {
    labels: timeList,
    datasets: [{
      label: 'Premium',
      data: _.map(formattedData, 'premium'),
      borderColor: '#bcaaa4'
    }]
  }


  const oi = {
    labels: timeList,
    datasets: [{
      label: 'OI',
      data: _.map(formattedData, 'liveData.oi'),
      borderColor: '#bcaaa4'
    }]
  }

  return {
    avgQuantityPerTick,
    futureSpot,
    premium,
    oi
  };  
}

function App() {
  const [_data, setData] = useState([]);
  const [dataSet, setDataSet] = useState([]);
  useEffect(() => {
    const a = async () => {
      const abc = await getFutureData();
      const formattedFutureData = formatFuture(abc);
      setDataSet(prepareDataSets(formattedFutureData));
    };
    a();
  }, [])

  return (
    <div>
      <h2>Future Spot</h2>
      {dataSet.futureSpot && <Line options={options} data={dataSet.futureSpot} />}
      <br />
      <h2>AVG Qunatity Per Tick</h2>
      {dataSet.avgQuantityPerTick && <Line options={options} data={dataSet.avgQuantityPerTick} />}
      <br />

      <h2>Premium</h2>
      {dataSet.premium && <Line options={options} data={dataSet.premium} />}

      <h2>OI</h2>
      {dataSet.oi && <Line options={options} data={dataSet.oi} />}
    </div>
  )
  
}


export default App;