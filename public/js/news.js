// Global cache object for news data
const newsCache = {};

// Function to fetch news data with caching and support for flexible queries
export const fetchNewsData = async (type = 'world', country = 'us', language = 'en') => {
    const now = Date.now();
    const cacheKey = `${type}-${country}-${language}`;

    // Initialize cache for the category if it doesn't exist
    if (!newsCache[cacheKey]) {
        newsCache[cacheKey] = {
            data: null,
            timestamp: null,
            ttl: 300000 // Time-to-live in milliseconds (e.g., 5 minutes)
        };
    }

    // Check if cached data is available and still valid
    if (newsCache[cacheKey].data && (now - newsCache[cacheKey].timestamp < newsCache[cacheKey].ttl)) {
        console.log(`Using cached news data for ${type} in ${country} (${language})`);
        return newsCache[cacheKey].data;
    }

    const categoryMap = {
        'world': 'general',
        'local': 'general',
        'technology': 'technology',
        'finance': 'business', // Map 'finance' to 'business' category
        'business': 'business',
        'economy': 'economy',
        'sports': 'sports',
        'events': 'entertainment',
        'other': 'general'
    };

    let newsUrl = `/api/news?category=${categoryMap[type]}&country=${country}&language=${language}`;

    try {
        const response = await fetch(newsUrl);
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('News API key is invalid or has expired.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Cache the fetched data and timestamp for the category
        newsCache[cacheKey].data = data;
        newsCache[cacheKey].timestamp = now;

        return data;
    } catch (error) {
        console.error('Error fetching news data:', error);
        return { 
            articles: [{ 
                title: 'Unable to fetch news', 
                description: error.message || 'An error occurred while fetching news.',
                url: '#'
            }] 
        };
    }
};

export function updateNews(data) {
    const container = document.querySelector('#news .data-container');

    if (!data || !data.articles || data.articles.length === 0) {
        container.innerHTML = '<p>No news articles found.</p>';
        return;
    }

    container.innerHTML = `
        <h3>Latest Headlines</h3>
        <ul>
            ${data.articles.slice(0, 5).map(article => `
                <li style="margin-bottom: 20px;">
                    ${article.urlToImage ? `<img src="${article.urlToImage}" alt="Thumbnail" style="max-width: 100px; margin-right: 10px;">` : ''}
                    <a href="${article.url}" target="_blank">${article.title}</a>
                    <p style="white-space: normal;">${article.description || 'No description available.'}</p>
                </li>
            `).join('')}
        </ul>
    `;
}