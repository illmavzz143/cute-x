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
    
    // Dajemy stronie chwilę na wyrenderowanie elementów przez JS
    console.log("Czekanie na załadowanie elementów...");
    await page.waitForTimeout(5000);

    console.log("Wyciąganie danych o petach...");
    const petsData = await page.evaluate(() => {
      let data = {};
      
      // Szukamy wszystkich elementów mogących zawierać karty zwierzaków (np. divy z linkami lub nagłówkami)
      const elements = document.querySelectorAll('a, div');
      
      elements.forEach(el => {
        let text = el.innerText ? el.innerText.trim() : '';
        // Szukamy linijek, które wyglądają jak nazwa i cena
        if (text && text.length < 100 && text.includes('\n')) {
          let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length >= 2) {
            let name = lines[0];
            let potentialPrice = lines[1];
            // Proste sprawdzenie czy druga linia ma cyfry (cenę)
            let match = potentialPrice.match(/[\d,.]+/);
            if (match && name.length > 2 && !data[name]) {
              let price = parseFloat(match[0].replace(/,/g, ''));
              if (!isNaN(price)) {
                data[name] = price;
              }
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
