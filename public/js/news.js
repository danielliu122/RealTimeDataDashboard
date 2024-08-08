// Global cache object for news data
const newsCache = {};

// Function to fetch news data with caching and support for flexible queries
export const fetchNewsData = async (type = 'world', country = 'us', language = 'en', forceRefresh = false) => {
    const cacheKey = `${type}-${country}-${language}`;

    // Initialize cache for the category if it doesn't exist
    if (!newsCache[cacheKey]) {
        newsCache[cacheKey] = {
            data: null,
            timestamp: null,
            ttl: 43200000 // Time-to-live in milliseconds (e.g., 12 hours)
        };
    }

    // Check if cached data is available and still valid
    if (!forceRefresh && newsCache[cacheKey].data && (Date.now() - newsCache[cacheKey].timestamp < newsCache[cacheKey].ttl)) {
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

    const newsUrl = `/api/news?category=${categoryMap[type]}&country=${country}&language=${language}`;

    try {
        const response = await fetch(newsUrl);
        const data = await response.json();
        if (response.ok && data.articles) {
            console.log('Valid response from news API');
            // Cache the fetched data and timestamp for the category
            newsCache[cacheKey].data = data;
            newsCache[cacheKey].timestamp = Date.now();

            return data;
        } else if (response.status === 429) {
            console.error('Error fetching news data: API rate limit exceeded');
            document.getElementById('news').style.display = 'none'; // Hide the news section
            alert('API rate limit exceeded. Please try again later.');
            return { 
                articles: [{ 
                    title: 'API rate limit exceeded', 
                    description: 'Please try again later.',
                    url: '#'
                }] 
            };
        } else {
            throw new Error('Invalid response from news API');
        }
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

// Function to update UI with news data
export function updateNews(data) {
    const container = document.querySelector('#news .data-container');
    container.innerHTML = ''; // Clear previous data

    if (!data || !data.articles || data.articles.length === 0) {
        container.innerHTML = '<p>No news articles found.</p>';
        return;
    }

    // Filter out articles without a thumbnail image
    const articlesWithThumbnails = data.articles.filter(article => article.urlToImage);

    if (articlesWithThumbnails.length === 0) {
        container.innerHTML = '<p>No news articles with thumbnails available.</p>';
        return;
    }

    // Pagination
    let currentPage = 1;
    const itemsPerPage = 5;
    const totalPages = Math.ceil(articlesWithThumbnails.length / itemsPerPage);

    const renderPage = (page) => {
        container.innerHTML = ''; // Clear previous data
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = articlesWithThumbnails.slice(start, end);

        container.innerHTML = `
            <ul>
                ${pageData.map(article => `
                    <li style="margin-bottom: 20px;">
                        <img src="${article.urlToImage}" alt="Thumbnail" style="max-width: 100px; margin-right: 10px;">
                        <a href="${article.url}" target="_blank">${article.title}</a>
                        <p style="white-space: normal;">${article.description || 'No description available.'}</p>
                    </li>
                `).join('')}
            </ul>
        `;

        // Pagination controls
        const paginationControls = document.createElement('div');
        paginationControls.classList.add('pagination-controls');

        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Previous';
            prevButton.onclick = () => {
                currentPage--;
                renderPage(currentPage);
            };
            paginationControls.appendChild(prevButton);
        }

        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next';
            nextButton.onclick = () => {
                currentPage++;
                renderPage(currentPage);
            };
            paginationControls.appendChild(nextButton);
        }

        container.appendChild(paginationControls);
    };

    renderPage(currentPage);
}