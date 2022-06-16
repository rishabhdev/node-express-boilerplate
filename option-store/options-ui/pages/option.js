import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
// import randomColor from 'randomcolor';
// import faker from 'faker';
import _ from 'lodash';
import { formatData, processOption } from '../utils/formatOption';

const getOptionsData = async () => {
 const x =  await axios.post('http://18.234.100.126:3000/v1/options/getData', {
    "start": "2022-06-14T09:15:00.882+05:30",
     "end": "2022-06-14T15:30:00.413+05:30",
     "type": "option",
     "expiry": "2022-06-16T00:00:00.000Z"
});

console.log('getOptionsData', x);
return x;
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

function App() {
  const [_data, setData] = useState([]);
  useEffect(() => {
    const a = async () => {
      const abc = await getOptionsData();
      const formattedData = formatData(abc);
      processOption(formattedData);
      console.log("formattedData", formattedData);
      setData(abc);
    };
    a();
  }, [])

  return <Line options={options} data={data} />;
}


export default App;