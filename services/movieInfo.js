import puppeteer from "puppeteer";
import {setTimeout} from "node:timers/promises";

const country_prefix = 'ar/buscar'  // reemplazar a futuro por setting en el bot

export async function getMovieInfo(title) {
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
    });
    
    const page = await browser.newPage();
    const query = title.replace(' ', '%20');
    const website = `https://www.justwatch.com/${country_prefix}?q=${query}`;
    
    try {
        await page.goto(website, {
            waitUntil: "domcontentloaded",
        });

        await page.waitForSelector('.title-list-row__row', {visible: true});

        const boxes_list = await page.$$('.title-list-row__row');

        const keywords = ['temporada', 'season'];

        const items = []

        for(let box of boxes_list) {
            try {
                let movie = await page.evaluate((box, keywords) => {
                    const titleElement = box.querySelector('.header-title');
                    const yearElement = box.querySelector('.header-year');
                    const posterElement = box.querySelector('span[data-v-8e48db44] img[data-v-293fad05]');
                    const buyboxStreamElements = box.querySelector('div[data-v-4ea74991]'); // div con plataformas
                    
                    const full_title = (titleElement ? titleElement.textContent.trim() : '') + (yearElement ? yearElement.textContent.trim() : '');
                    const poster = posterElement ? posterElement.src : '';
                    
                    let plataforms = [];
                    let seasons = []
                    if(buyboxStreamElements){ 
                        const kind_of_service = buyboxStreamElements.querySelector('label[data-v-4ea74991]');
                        
                        // Se valida que el elemento tomado sea de plataformas de Stream
                        if(kind_of_service.textContent.includes('Stream')) {
                            const buyboxElements = buyboxStreamElements.querySelectorAll('picture[data-v-4465fbc1] img[data-v-4465fbc1]');    
                            const offerLabelElements = buyboxStreamElements.querySelectorAll('div[data-v-4465fbc1]');
                            
                            seasons = Array.from(offerLabelElements).map(s => s.textContent.trim());    // Se toma la informacion de las temporadas
                            seasons = seasons.map(s => keywords.some(keyword => s.toLowerCase().includes(keyword)) ? s : ' ');
                            plataforms = Array.from(buyboxElements).map(p => p.alt.trim());    
                        }
                    }
                    
                    window.scrollBy(0, innerHeight);

                    return {
                        title: full_title,
                        poster: poster,
                        plataforms: plataforms,
                        add_info: seasons
                    }
                    
                }, box, keywords);

                items.push(movie)

                await setTimeout(500);
            
            } catch(error) {
                console.error('Error evaluating page content: ', error);
            }
        }

        return items;
    } catch(error) {
        console.error('Error navigating to URL: ', error);
    } finally {
        await browser.close();
    }
}

