// Global cache object for news data
const newsCache = {};

// Function to fetch news data with caching and support for flexible queries
export const fetchNewsData = async (query = 'world', country = 'us', language = 'en', forceRefresh = false) => {
    const cacheKey = `${query}-${country}-${language}`;

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

    const newsUrl = `/api/news?query=${query}&country=${country}&language=${language}`;

    try {
        const response = await fetch(newsUrl);
        const data = await response.json();
        //console.log('Fetched news data:', data);
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

    // Use the original data and filter to ensure each article has an image and description
    const articlesToDisplay = data.filter(article => article.urlToImage && article.description);

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
                    <li class="news-item">
                        <img src="${article.urlToImage}" alt="Thumbnail" class="news-thumbnail">
                        <h3>${article.title}</h3>
                        <p">${article.description}</p>
                        <br>
                        <p style="text-indent: 20px;">Written by: ${article.author || 'Unknown'}
                        on ${new Date(article.publishedAt).toLocaleDateString() || 'N/A'}</p>
                        <p>From: ${article.source.name || 'N/A'}</p>
                        <a href="${article.url}" target="_blank">Read more</a>
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