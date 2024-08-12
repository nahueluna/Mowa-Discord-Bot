import puppeteer from "puppeteer";
import {setTimeout} from "node:timers/promises";

export async function getMovieInfo(query) {
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
    });
    
    const page = await browser.newPage();
    const website = `https://www.justwatch.com/`;
    
    try {
        await page.goto(website, {
            waitUntil: "domcontentloaded",
        });

        // Accede a la barra de búsqueda e ingresa el título
        await page.locator('input[aria-label="search text"]').hover();
        await page.locator('input[aria-label="search text"]').fill(query);
        await page.keyboard.press('Enter');
        
        await page.waitForSelector('.title-list-row__row', {visible: true, timeout: 20_000});

        const boxes_list = await page.$$('.title-list-row__row');
        const items = [];

        await setTimeout(500);

        for(let box of boxes_list) {
            items.push(await getMovieMainInfo(page, box));

            await setTimeout(500);
        }

        for(let item of items) {
            if(item.url) {
                const movieDetail = await getMovieDetails(page, item);
                item.synopsis = movieDetail.synopsis;
                item.duration = movieDetail.duration;
                item.genre = movieDetail.genres;
            }
        }

        return items;

    } catch(error) {
        console.error('Error navigating to URL: ', error);
    } finally {
        await browser.close();
    }
}

async function getMovieMainInfo(page, box) {
    try {
        const seasonKeywords = ['temporada', 'season'];
        
        const movie = await page.evaluate(box => {
            const titleElement = box.querySelector('.header-title');
            const titleUrl = box.querySelector('.title-list-row__column-header').href || '';
            const yearElement = box.querySelector('.header-year');
            const posterElement = box.querySelector('span.title-poster img');
            const buyboxStreamElements = box.querySelector('div.buybox-row.stream.inline'); // div con plataformas
            const scoringElements = box.querySelector('div.jw-scoring-listing__rating'); // div con puntuacion
            
            const fullTitle = (titleElement ? titleElement.textContent.trim() : '') + ' ' + (yearElement ? yearElement.textContent.trim() : '');
            const poster = posterElement ? posterElement.src : '';
            const score = scoringElements ? scoringElements.textContent : '';
            
            let plataforms = [];
            let seasons = []
            if(buyboxStreamElements){ 
                const kind_of_service = buyboxStreamElements.querySelector('label.buybox-row__label');
                
                // Se valida que el elemento tomado sea de plataformas de Stream
                if(kind_of_service.textContent.includes('Stream')) {
                    const buyboxElements = buyboxStreamElements.querySelectorAll('picture img.offer__icon');    
                    const offerLabelElements = buyboxStreamElements.querySelectorAll('div.offer__label');
                    
                    seasons = Array.from(offerLabelElements).map(s => s.textContent.trim());    // Se toma la informacion de las temporadas
                    plataforms = Array.from(buyboxElements).map(p => p.alt.trim());    
                }
            }
            
            window.scrollBy(0, innerHeight);

            return {
                title: fullTitle,
                url: titleUrl,
                poster: poster,
                plataforms: plataforms,
                add_info: seasons,
                scoring: score,
                synopsis: '',
                duration: '',
                genre: '',
            }
            
        }, box).catch(error => {console.error('Error evaluating box content: ', error)});

        // Se almacenan solo las temporadas de las series, fuera del contexto de evaluate
        movie.add_info = movie.add_info.map(s => seasonKeywords.some(seasonKeywords => s.toLowerCase().includes(seasonKeywords)) ? s : ' ');

        return movie;
    } catch(error) {
        console.error('Error evaluating page content: ', error);
    }
}

async function getMovieDetails(page, movie) {
    try {
        const durationKeywords = ['duración', 'runtime'];
        const genreKeywords = ['géneros', 'genre'];
        
        await page.goto(movie.url, {
            waitUntil: "domcontentloaded",
        });
        
        await page.waitForSelector('.title-detail__title', {visible: true, timeout: 10_000});

        const movieDetail = await page.evaluate((durationKeys, genreKeys) => {
            const titleInfo = document.querySelector('.title-info.title-info');

            const infoDetail = titleInfo.querySelectorAll('.detail-infos');
            let duration = null;
            let genres = null;
            
            for(let detail of infoDetail) {
                const element = detail.querySelector('h3').textContent;
                
                if(durationKeys.some(durationKeys => element.toLowerCase().includes(durationKeys)) && !duration) {
                    duration = detail.querySelector('.detail-infos__value').textContent.trim();
                }
                else if(genreKeys.some(genreKeys => element.toLowerCase().includes(genreKeys)) && !genres) {
                    genres = detail.querySelector('.detail-infos__value').textContent.trim();
                }

                if(duration && genres) {
                    break;
                }
            }

            const synopsis = document.querySelector('.text-wrap-pre-line.mt-0').textContent.trim() || '';

            return {
                duration: duration,
                genres: genres,
                synopsis: synopsis
            }
        }, durationKeywords, genreKeywords);

        return movieDetail;
    } catch(error) {
        console.error('Error getting movie details: ', error);
    }
}