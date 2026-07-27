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
    // Czekamy aż pojawią się nagłówki z nazwami petów
    await page.waitForSelector('h2.font-bold', { timeout: 15000 }).catch(() => {});

    // Przewijamy stronę do dołu, żeby załadować wszystkie elementy (infinite scroll / lazy load)
    console.log("Przewijanie strony, aby załadować wszystkie zwierzaki...");
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 500;
        let timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await page.waitForTimeout(2000);

    console.log("Wyciąganie danych o petach...");
    const petsData = await page.evaluate(() => {
      let data = {};
      
      // Szukamy wszystkich kart zwierzaków na stronie
      // Karta zazwyczaj zawiera tag h2 z nazwą
      const cards = document.querySelectorAll('div');
      
      cards.forEach(card => {
        const h2 = card.querySelector('h2.font-bold');
        if (h2) {
          let name = h2.innerText.trim();
          let cardText = card.innerText;
          
          // Szukamy wartości (Value) w tekście karty
          // Tekst zazwyczaj zawiera sekcję z wartością
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
