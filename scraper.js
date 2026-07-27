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
    await page.goto('https://amvgg.com/values/pets', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    console.log("Czekanie na załadowanie kart...");
    await page.waitForSelector('h2.font-bold', { timeout: 15000 }).catch(() => {});

    let allPets = {};
    let previousHeight = 0;
    let sameHeightCount = 0;

    console.log("Przewijanie i zbieranie wszystkich zwierzaków do końca strony...");
    
    // Robimy pętle dopóki strona się przewija (maksymalnie 80 kroków)
    for (let i = 0; i < 80; i++) {
      const currentBatch = await page.evaluate(() => {
        let data = {};
        const cards = document.querySelectorAll('div');
        
        cards.forEach(card => {
          const h2 = card.querySelector('h2.font-bold');
          if (h2) {
            let name = h2.innerText.trim();
            let cardText = card.innerText;
            
            let match = cardText.match(/Value\s*([\d,.]+)/i);
            if (match) {
              let priceStr = match[1].replace(/,/g, '');
              let price = parseFloat(priceStr);
              if (!isNaN(price) && name) {
                data[name] = price;
              }
            }
          }
        });
        return data;
      });

      Object.assign(allPets, currentBatch);
      
      // Sprawdzamy wysokość strony przed i po przewinięciu
      let currentHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(600);
      
      let newHeight = await page.evaluate(() => document.body.scrollHeight);
      
      // Jeśli wysokość się nie zmieniła przez kilka kroków, to znaczy, że jesteśmy na samym dole
      if (newHeight === previousHeight) {
        sameHeightCount++;
        if (sameHeightCount >= 3) {
          console.log("Osiągnięto koniec strony.");
          break;
        }
      } else {
        sameHeightCount = 0;
      }
      previousHeight = newHeight;
    }

    console.log(`Łącznie znaleziono unikalnych petów: ${Object.keys(allPets).length}`);

    fs.writeFileSync('pets.json', JSON.stringify(allPets, null, 2));
    console.log("Zapisano pomyślnie do pets.json!");

  } catch (error) {
    console.error("Błąd podczas skrapowania:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

scrapePets();
