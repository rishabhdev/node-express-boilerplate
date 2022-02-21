// const puppeteer = require('puppeteer');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios').default;


const openPage = async (browser) => {
  console.log('openPage')
  const page = await browser.newPage();
  await page.goto('https://www.nseindia.com/option-chain');
  await page.screenshot({ path: 'example.png' });
  page.on('response', async (response) => {  
    if (response.url() == "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY"){
        console.log('XHR response received'); 
        const respData = await response.json(); 
        const filtered = respData.filtered.data
        const cleaned = filtered.filter(item => {
          if (Math.abs(item.CE.underlyingValue - item.CE.strikePrice) < 500) {
            return true;
          }
        })
        console.log('cleaned', cleaned)
        await axios.post('http://localhost:3000/v1/options/insertData', { data: cleaned })
        page.close();
    } 
  }); 
  setTimeout(() => page.close(), 60*1000);
}

(async () => {
  puppeteer.use(StealthPlugin());
  puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
  const browser = await puppeteer.launch();
  setInterval(() => openPage(browser), 60*3*1000);
})();