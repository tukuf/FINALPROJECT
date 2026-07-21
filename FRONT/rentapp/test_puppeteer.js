const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  const delay = ms => new Promise(res => setTimeout(res, ms));

  await page.goto('http://localhost:3000/properties', { waitUntil: 'networkidle0' });
  
  await delay(1000);
  
  const cards = await page.$$('div[style*="cursor: pointer"]');
  if (cards.length > 0) {
    await cards[0].click();
    await delay(1000);
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const tourBtn = btns.find(b => b.innerText.includes('Start Virtual'));
      if (tourBtn) tourBtn.click();
    });
    
    await delay(2000);
    
    const info = await page.evaluate(() => {
      const pano = document.querySelector('.tour-pano-container');
      if (!pano) return 'No pano container';
      const canvas = pano.querySelector('canvas');
      if (!canvas) return 'No canvas';
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const err = gl ? gl.getError() : 'No GL';
      return {
         width: canvas.width,
         height: canvas.height,
         styleWidth: canvas.style.width,
         styleHeight: canvas.style.height,
         glError: err,
         display: getComputedStyle(canvas).display
      };
    });
    console.log('Canvas info:', info);
  }

  await browser.close();
})();
