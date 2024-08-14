const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');  // For hashing filenames
const url = require('url');

const websiteUrl = 'https://www.tu-sofia.bg/';
const outputDir = './output';
const baseDomain = new URL(websiteUrl).hostname;  // Extract the base domain
const ignoredDomainsRegex = /facebook\.com|linkedin\.com|youtube\.com|focus-news\.net|novini\.bg|sliveninfo\.bg|utroruse\.com|trafficnews\.bg|pressoffice\.tu-sofia\.bg|career\.tu-sofia\.bg|digilib\.nalis\.bg|proceedings\.tu-sofia\.bg|sopkoni\.tu-sofia\.bg|elara\.tu-sofia\.bg|design\.tu-sofia\.bg|otsk-nk\.tu-sofia\.bg|rcvt\.tu-sofia\.bg|e-university\.tu-sofia\.bg|ef-conference\.tu-sofia\.bg|infotech-bg\.com|bultrans\.org|metrology-bg\.org|konkursi-as\.tu-sofia\.bg|google\.com/i;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Intercept network requests to handle file downloads
  await page.route('**/*', async (route) => {
    const request = route.request();
    const fileUrl = request.url();

    // Determine file type by extension
    const fileExtensions = ['.pdf', '.avi', '.mp4', '.jpg', '.png', '.zip', '.rar', '.doc', '.docx', '.xls', '.xlsx'];
    const extension = path.extname(fileUrl).toLowerCase();

    if (fileExtensions.includes(extension)) {
      console.log(`Downloading file from ${fileUrl}`);
      let buffer;
      const maxRetries = 3;
      let retries = 0;

      while (retries < maxRetries) {
        try {
          // Fetch the file content
          const response = await page.request.fetch(request);
          buffer = await response.body();
          break; // Exit loop if successful
        } catch (error) {
          retries++;
          console.log(`Failed to download ${fileUrl}. Retry ${retries}/${maxRetries}`);
          if (retries === maxRetries) {
            console.log(`Skipping ${fileUrl} after ${maxRetries} retries.`);
            return route.abort(); // Abort the request after max retries
          }
        }
      }

      if (buffer) {
        // Hash the file path to avoid long filenames
        const hash = crypto.createHash('md5').update(fileUrl).digest('hex');
        const urlObj = new URL(fileUrl);
        const directory = path.join(outputDir, urlObj.hostname);
        const filePath = path.join(directory, `${hash}${extension}`);

        // Ensure directory exists
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(filePath, buffer);
      }

      return route.abort(); // Abort the navigation
    }

    // Continue navigation for HTML pages
    return route.continue();
  });

  const crawledPages = new Set();
  const queue = [websiteUrl];

  while (queue.length > 0) {
    const currentPageUrl = queue.shift();
    if (crawledPages.has(currentPageUrl)) continue;
    crawledPages.add(currentPageUrl);

    console.log(`Crawling ${currentPageUrl}`);

    try {
      const currentUrlObj = new URL(currentPageUrl);

      // Check if the URL belongs to the base domain
      if (currentUrlObj.hostname !== baseDomain) {
        console.log(`Skipping ${currentPageUrl} - Outside of base domain`);
        continue; // Skip URLs outside of the base domain
      }

      await page.goto(currentPageUrl, { timeout: 60000 });

      // Wait for the page to be fully loaded
      await page.waitForLoadState('load');

      // Extract the content safely
      let html;
      try {
        html = await page.content();
      } catch (error) {
        console.log(`Error retrieving content for ${currentPageUrl}: ${error.message}`);
        continue; // Skip to the next URL
      }

      const $ = cheerio.load(html);

      // Extract text content
      const textContent = $('body').text().trim();
      const urlObj = new URL(currentPageUrl);
      const hostname = urlObj.hostname;

      // Hash the file path to avoid long filenames
      const hash = crypto.createHash('md5').update(urlObj.pathname).digest('hex');
      const textFilePath = path.join(outputDir, hostname, hash, 'index.txt');

      fs.mkdirSync(path.dirname(textFilePath), { recursive: true });
      fs.writeFileSync(textFilePath, textContent);

      // Find new links to crawl
      const newLinks = [];
      $('a').each((index, element) => {
        const href = $(element).attr('href');
        if (href && href.startsWith('http')) {
          const linkUrlObj = new URL(href);
          const linkHostname = linkUrlObj.hostname;

          // Skip ignored domains and URLs outside the base domain
          if (!ignoredDomainsRegex.test(linkHostname) && linkHostname === baseDomain) {
            newLinks.push(href);
          }
        }
      });

      // Add new links to the queue for BFS
      queue.push(...newLinks);
    } catch (error) {
      console.log(`Error loading or processing ${currentPageUrl}: ${error.message}`);
      continue; // Skip to the next URL
    }
  }

  await browser.close();
})();
