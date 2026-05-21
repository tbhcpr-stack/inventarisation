require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('🚀 Starting RS.ge Downloader...');

  // 1. Launch Configuration
  const browser = await puppeteer.launch({
    headless: false, // Set to true to run without UI
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox', 
      '--disable-setuid-sandbox'
    ]
  });

  try {
    const page = await browser.newPage();

    // 2. Setup Download Behavior (CDP)
    // This ensures files are downloaded to our local 'downloads' folder
    const downloadPath = path.resolve(__dirname, 'downloads');
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath);
    }

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    console.log(`📂 Download path set to: ${downloadPath}`);

    // 3. Login Flow
    const loginUrl = process.env.RS_LOGIN_URL || 'https://eservices.rs.ge/Login.aspx';
    console.log(`🔗 Navigating to login: ${loginUrl}`);
    
    // ASP.NET sites can be slow, wait for network idle
    await page.goto(loginUrl, { waitUntil: 'networkidle0' });

    console.log('🔑 Entering credentials...');
    // Standard RS.ge ASP.NET Control IDs
    const userSelector = '#txtUserName';
    const passSelector = '#txtPassword';
    const btnSelector = '#btnLogin';

    await page.waitForSelector(userSelector);
    await page.type(userSelector, process.env.RS_USERNAME || '');
    await page.type(passSelector, process.env.RS_PASSWORD || '');
    
    console.log('🖱️ Clicking login...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click(btnSelector),
    ]);
    console.log('✅ Login successful.');

    // 4. Navigate to Waybills Dashboard
    const dashboardUrl = 'https://eservices.rs.ge/WayBills.aspx';
    console.log(`🔗 Navigating to Dashboard: ${dashboardUrl}`);
    await page.goto(dashboardUrl, { waitUntil: 'networkidle0' });

    // 5. Execute Export Script
    console.log('⚡ Triggering ExportNew...');
    
    // Execute the ASP.NET JavaScript function directly in the browser context
    await page.evaluate(() => {
        // @ts-ignore
        if (typeof grdWaybills !== 'undefined' && grdWaybills.ExportNew) {
            // The arguments 1, true, 'WaybillsGoodsExport' are from the prompt requirement
            // @ts-ignore
            grdWaybills.ExportNew(1, true, 'WaybillsGoodsExport');
        } else {
            throw new Error('grdWaybills object not found on page. Check if the dashboard loaded correctly.');
        }
    });

    // 6. Handle Download
    console.log('⏳ Waiting for file generation and download...');
    
    // We expect a file to appear or the browser to handle the stream.
    // Since we set download behavior via CDP, we wait a reasonable amount of time 
    // for the server to generate the Excel file.
    await new Promise(resolve => setTimeout(resolve, 10000)); 

    const files = fs.readdirSync(downloadPath);
    if (files.length > 0) {
        console.log(`✅ Success! Files in download folder: ${files.join(', ')}`);
    } else {
        console.warn('⚠️ No files found in download folder yet. The export might be taking longer than expected.');
    }

  } catch (error) {
    console.error('❌ Error during automation:', error);
  } finally {
    console.log('🛑 Closing browser...');
    await browser.close();
  }
})();