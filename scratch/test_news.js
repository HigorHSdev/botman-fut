const { getNewArticles } = require('./execution/telegram_bot/newsService');

async function test() {
    console.log('Testing news fetching...');
    try {
        const articles = await getNewArticles();
        console.log(`Found ${articles.length} new articles.`);
        articles.forEach(a => {
            console.log(`- ${a.title} (${a.source})`);
        });
    } catch (error) {
        console.error('Error fetching news:', error);
    }
}

test();
