// Global cache object for news data
const newsCache = {};

// Function to fetch news data with caching and support for flexible queries
export const fetchNewsData = async (type = 'world', country = 'us', language = 'en', forceRefresh = false) => {
    const cacheKey = `${type}-${country}-${language}`;

    // Initialize cache for the category if it doesn't exist
    if (!newsCache[cacheKey]) {
        newsCache[cacheKey] = {
            data: [], // Set to an empty array instead of null
            timestamp: null,
            ttl: 43200000 // Time-to-live in milliseconds (e.g., 12 hours)
        };
    }

    // Check if cached data is available and still valid
    if (!forceRefresh && newsCache[cacheKey].data.length > 0 && (Date.now() - newsCache[cacheKey].timestamp < newsCache[cacheKey].ttl)) {
        console.log('Using cached news data for:', cacheKey); // Log when cached data is used
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
        console.log('Fetched news data:', data);
        if (response.ok && data.articles) {
            // Cache the fetched data and timestamp for the category
            newsCache[cacheKey].data = data.articles; // Store articles directly
            newsCache[cacheKey].timestamp = Date.now();

            return data.articles; // Return articles directly
        } else {
            // Log the response status for better debugging
            console.error('Error fetching news data:', response.status, data);
            throw new Error('Invalid response from news API');
        }
    } catch (error) {
        console.error('Error fetching news data:', error);
        return []; // Return an empty array on error
    }
};

// Function to update UI with news data
export function updateNews(data) {
    const container = document.querySelector('#news .data-container');
    container.innerHTML = ''; // Clear previous data

    if (!data || !Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<p>No news articles found.</p>';
        return;
    }

    // Use the original data instead of filtering
    const articlesToDisplay = data.filter(article => article.urlToImage || true); // Keep all articles

    // Pagination
    let currentPage = 1;
    const itemsPerPage = 5;
    const totalPages = Math.ceil(articlesToDisplay.length / itemsPerPage);

    const renderPage = (page) => {
        container.innerHTML = ''; // Clear previous data
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = articlesToDisplay.slice(start, end);

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