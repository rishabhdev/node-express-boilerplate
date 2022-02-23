import { useState } from "react";
import axios from "axios";

import ReactTable from 'react-table'

// await axios.post('http://localhost:3000/v1/options/insertData', { data: cleaned })

const AnaylsePage = () => {
  const [query, setQuery] = useState('');
  const [formatter, setFormatter] = useState('');
  const [rowFormatter, setRowFormatter] = useState('');
  const [finalData, setFinalData] = useState([]);
  const runQuery = async () => {
    const response = await axios.post('http://54.89.58.37:3000/v1/options/getData', query ? JSON.parse(query): {})
    console.log("response", response);
    try {
      let formattedData = response.data;
      if (formatter) {
        const formatterClenaed = `(context) => { ${formatter} }`;
        formattedData = eval(formatterClenaed)({ data: response.data });
      }

      if (!formattedData.length) {
        console.warn("Step1: table data not a non empty array", formattedData);
        return;
      }
      let rowCleaned = formattedData;
      if (rowFormatter) {
        const rowFormatterCleaned = eval(`(context) => { ${rowFormatter} }`);
        rowCleaned = formattedData.map((row, index) => rowFormatterCleaned({ row, index, tableData: formattedData }));
        console.log(rowCleaned);
      }

      if (!rowCleaned.length) {
        console.warn("Step2: table data not a non empty array", rowCleaned);
        return;
      }
      console.log("rowCleaned", rowCleaned);
      setFinalData(rowCleaned);
    } catch (e) {
      console.log('Error', e)
    }
    // const formattedData = 
  };


  return (<div className="flex">
    <div>
      <div className="my-8">
        <h3>Query</h3>
        <textarea onChange={(e) => setQuery(e.target.value)} cols="40" rows="5" className="border border-sky-500" placeholder="Json will be passed to the get api"/>
      </div>
      <div className="my-8">
        <h3>Table Data Formatter</h3>
        <textarea onChange={(e) => setFormatter(e.target.value)} cols="40" rows="5" className="border border-sky-500" placeholder="context param has response data. It should return an array which will be fed the table"/>
      </div>

      <div className="my-8">
        <h3>Row formatter</h3>
        <textarea onChange={(e) => setRowFormatter(e.target.value)} cols="40" rows="5" className="border border-sky-500"  placeholder="Will be executed for each row. Return object. Context will have row, index, tableData"/>
      </div>
      <div className="my-8">
        <button className="px-8 py-2 font-semibold text-sm bg-cyan-500 text-white rounded-full shadow-sm" onClick={runQuery}>Run</button>
      </div>
    </div>

    <div className="ml-4">
    {
      finalData.length && (
        <table>
          <thead>
            {
              Object.keys(finalData[0]).map((key, index) => (
                <th key={index}>{key}</th>
              ))
            }
          </thead>
          <tbody>
            {
              finalData.map((row, index) => {
                return (
                  <tr key={index}>
                    {
                      Object.keys(row).map((key, index) => (
                        <td key={index}>{(typeof row[key]) === 'object' ? JSON.stringify(row[key]): row[key] }</td>
                      ))
                    }
                  </tr>
                )
              })
            }
            </tbody>
        </table>
      )
    }
    </div>
    <div>
    </div>


  </div>)
}

export default AnaylsePage;