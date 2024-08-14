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
            waitUntil: "networkidle2",
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
                const kindOfService = buyboxStreamElements.querySelector('label.buybox-row__label');
                const service = kindOfService ? kindOfService.textContent : '';
                
                // Se valida que el elemento tomado sea de plataformas de Stream
                if(service.includes('Stream')) {
                    const buyboxElements = buyboxStreamElements.querySelectorAll('picture img.offer__icon');    
                    const offerLabelElements = buyboxStreamElements.querySelectorAll('div.offer__label');
                    
                    seasons = Array.from(offerLabelElements).map(s => s ? s.textContent.trim() : '');    // Se toma la informacion de las temporadas
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
        movie.add_info = movie.add_info.map(s => seasonKeywords.some(seasonKeywords => s.toLowerCase().includes(seasonKeywords)) ? s : '');

        return movie;
    } catch(error) {
        console.error('Error evaluating page content: ', error);
    }
}

export async function getMovieDetails(movie) {
    try {
        const durationKeywords = ['duración', 'runtime'];
        const genreKeywords = ['géneros', 'genre'];
        
        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
        });
    
        const page = await browser.newPage();

        await page.goto(movie.url, {
            waitUntil: "networkidle2",
        });
        
        await page.waitForSelector('.title-detail__title', {visible: true, timeout: 10_000});

        const movieDetail = await page.evaluate((durationKeys, genreKeys) => {
            const titleInfo = document.querySelector('.title-info.title-info');

            const infoDetail = titleInfo.querySelectorAll('.detail-infos');
            let duration = null;
            let genres = null;
            
            for(let detail of infoDetail) {
                const htmlDetailElement = detail.querySelector('h3');
                const detailElement = htmlDetailElement ? htmlDetailElement.textContent.trim() : '';
                
                if(durationKeys.some(durationKeys => detailElement.toLowerCase().includes(durationKeys)) && !duration) {
                    const durationElement = detail.querySelector('.detail-infos__value');
                    duration = durationElement ? durationElement.textContent.trim() : '';
                }
                else if(genreKeys.some(genreKeys => detailElement.toLowerCase().includes(genreKeys)) && !genres) {
                    const genresElement = detail.querySelector('.detail-infos__value');
                    genres = genresElement ? genresElement.textContent.trim() : '';
                }

                if(duration && genres) {
                    break;
                }
            }

            const synopsisElement = document.querySelector('#synopsis.jump-link-anchor p');
            const synopsis = synopsisElement ? synopsisElement.textContent.trim() : '';

            return {
                duration: duration,
                genres: genres,
                synopsis: synopsis
            }
        }, durationKeywords, genreKeywords);

        movie.synopsis = movieDetail.synopsis;
        movie.duration = movieDetail.duration;
        movie.genre = movieDetail.genres;

    } catch(error) {
        console.error('Error getting movie details: ', error);
    } finally {
        return movie;
    }
}