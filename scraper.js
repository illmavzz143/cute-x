const { chromium } = require('playwright');
const fs = require('fs');

async function scrapePets() {
  console.log("Uruchamianie przeglądarki...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    console.log("Wchodzenie na stronę amvgg...");
    await page.goto('https://amvgg.com/values/pets', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Krótkie upewnienie się, że elementy się załadowały
    await page.waitForSelector('a[href*="/pet/"]', { timeout: 15000 }).catch(() => {});

    console.log("Wyciąganie danych o petach...");
    const petsData = await page.evaluate(() => {
      let data = {};
      document.querySelectorAll('a[href*="/pet/"]').forEach(el => {
        let name = el.getAttribute('href').split('/').pop().replace(/_/g, ' ').replace(/-/g, ' ');
        name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        let text = el.innerText || '';
        let match = text.match(/[\d,.]+/);
        if (match) {
          let price = parseFloat(match[0].replace(/,/g, ''));
          if (!isNaN(price)) data[name] = price;
        }
      });
      return data;
    });

    console.log(`Znaleziono petów: ${Object.keys(petsData).length}`);

    // Zapis do pliku JSON
    fs.writeFileSync('pets.json', JSON.stringify(petsData, null, 2));
    console.log("Zapisano pomyślnie do pets.json!");

  } catch (error) {
    console.error("Błąd podczas skrapowania:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

scrapePets();
