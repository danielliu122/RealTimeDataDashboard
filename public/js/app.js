// app.js
// The 'require' statement is not needed in browser-side JavaScript.
// Configuration is now fetched from the server.

// Existing async function to fetch data from a URL
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Global cache object for news data
const newsCache = {};

// Update fetchNewsData function to use caching and support flexible queries
const fetchNewsData = async (type = 'world', country = 'us', language = 'en') => {
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
        'finance': 'finance',
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

// Function to fetch financial data
const fetchFinancialData = async (symbol = 'AAPL', timeRange = '1d', interval = '1m') => {
    try {
        const response = await fetch(`/api/finance/${symbol}?range=${timeRange}&interval=${interval}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const prices = result.indicators.quote[0].close;

        const dates = timestamps.map(ts => new Date(ts * 1000).toISOString());
        return { dates, prices, symbol, timeRange };
    } catch (error) {
        console.error('Error fetching financial data:', error);
        return { error: 'Unable to fetch financial data' };
    }
};

// Function to fetch real-time financial data from the server
const fetchRealTimeYahooFinanceData = async (symbol = 'AAPL') => {
    try {
        const response = await fetch(`/api/finance/${symbol}`, {
            redirect: 'follow' // Ensure fetch follows redirects
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const result = data.chart.result[0];
        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const change = meta.regularMarketChange;
        const changePercent = meta.regularMarketChangePercent;
        const timestamp = new Date(meta.regularMarketTime * 1000);

        return { symbol, price, change, changePercent, timestamp };
    } catch (error) {
        console.error('Error fetching real-time Yahoo Finance data:', error);
        return { error: 'Unable to fetch real-time financial data' };
    }
};

// Function to update UI with real-time financial data
function updateRealTimeFinance(data) {
    const container = document.querySelector('#finance .data-container');
    if (data.error) {
        container.innerHTML = '<p>Unable to fetch real-time financial data.</p>';
        return;
    }

    // Ensure properties are defined
    const price = data.price !== undefined ? data.price.toFixed(2) : 'N/A';
    const change = data.change !== undefined ? data.change.toFixed(2) : 'N/A';
    const changePercent = data.changePercent !== undefined ? data.changePercent.toFixed(2) : 'N/A';
    const timestamp = data.timestamp ? data.timestamp.toLocaleTimeString() : 'N/A';

    container.innerHTML = `
        <h3>Real-Time Stock Data (${data.symbol})</h3>
        <p>Price: $${price}</p>
        <p>Change: ${change} (${changePercent}%)</p>
        <p>Last Updated: ${timestamp}</p>
    `;
}

// Function to refresh real-time financial data
async function refreshRealTimeFinanceData(symbol) {
    const financeData = await fetchRealTimeYahooFinanceData(symbol);
    updateRealTimeFinance(financeData);
}

// Global variable to track if the map is initialized
let isMapInitialized = false;

// Global variable to store the geocoder
let geocoder;

// Add this function definition before the initMap function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

let map;
let trafficLayer;
let trafficUpdateInterval;

// Update loadGoogleMapsScript function
async function loadGoogleMapsScript() {
    try {
        const response = await fetchData('/api/config');
        const config = response;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsApiKey}&v=beta&libraries=places,geometry&callback=initMap&loading=async`;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    } catch (error) {
        console.error('Error loading Google Maps script:', error);
        throw error;
    }
}

function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Map container element not found');
        return;
    }

    // Default center (USA)
    const defaultCenter = { lat: 39.8283, lng: -98.5795 };

    map = new google.maps.Map(mapElement, {
        zoom: 4,
        center: defaultCenter,
        mapId: 'YOUR_MAP_ID_HERE'
    });

    // Create the search box and link it to the UI element.
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search for a location";
    input.className = "controls"; // Apply the CSS class

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    searchBox = new google.maps.places.SearchBox(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener("bounds_changed", () => {
        searchBox.setBounds(map.getBounds());
    });

    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }

        // For each place, get the icon, name and location.
        const bounds = new google.maps.LatLngBounds();

        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
                console.log("Returned place contains no geometry");
                return;
            }

            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);

        // Update traffic info for the new location
        if (places[0] && places[0].geometry) {
            const location = places[0].geometry.location;
            updateTrafficInfo({ lat: location.lat(), lng: location.lng() });
        }
    });

    // Add traffic layer
    trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);

    isMapInitialized = true;
    console.log('Map initialized');

    // Try to get the user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                map.setCenter(pos);
                map.setZoom(12); // Zoom in when we have the user's location

                // Update traffic info for the current location
                updateTrafficInfo(pos);

                console.log('Map centered on current location');
            },
            () => {
                console.warn('Geolocation permission denied or failed. Using default center.');
                // If geolocation fails, we're already centered on the default location
                updateTrafficInfo(defaultCenter);
            }
        );
    } else {
        console.warn('Geolocation not supported. Using default center.');
        updateTrafficInfo(defaultCenter);
    }

    // Debounced update function
    const debouncedUpdate = debounce(async () => {
        const center = map.getCenter();
        await updateTrafficInfo({ lat: center.lat(), lng: center.lng() });
    }, 300);

    // Add event listener for map idle state
    map.addListener('idle', debouncedUpdate);

    // Start periodic traffic updates
    startPeriodicTrafficUpdates();
}

function startPeriodicTrafficUpdates() {
    // Update traffic every 5 minutes (300000 ms)
    trafficUpdateInterval = setInterval(async () => {
        const center = map.getCenter();
        await updateTrafficInfo({ lat: center.lat(), lng: center.lng() });
    }, 300000);
}

const updateTrafficInfo = async (location) => {
    //console.log('Updating traffic info for', location);
    if (!location || typeof location.lat === 'undefined' || typeof location.lng === 'undefined') {
        console.error('Invalid location provided to updateTrafficInfo');
        return;
    }

    // Here you can add any additional logic for updating traffic info
    // For now, we are just logging the location
    //console.log('Traffic info updated for location:', location);
}

// Function to fetch Google Trends data
const fetchTrendsData = async (type = 'daily', category = 'all', country = '') => {
    try {
        const response = await fetch(`/api/trends?type=${type}&category=${category}&country=${country}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Log the response text for debugging
        const responseText = await response.text();
        console.log('Response Text:', responseText);

        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Received non-JSON response');
        }

        const data = JSON.parse(responseText);
        return data;
    } catch (error) {
        console.error('Error fetching trends data:', error);
        return { error: 'Unable to fetch trends data' };
    }
};

// Function to update the trends section with fetched data
const updateTrends = (data, category) => {
    const trendsSection = document.querySelector('#trends .data-container');
    trendsSection.innerHTML = ''; // Clear previous data

    if (data.error) {
        trendsSection.innerHTML = `<p>${data.error}</p>`;
        return;
    }

    // Log the entire data object for debugging
    console.log('Trends Data:', data);

    // Check if the data structure is for daily trends
    if (data.default && data.default.trendingSearchesDays && Array.isArray(data.default.trendingSearchesDays)) {
        console.log('Processing daily trends data');
        console.log('Daily Trends Data:', data.default.trendingSearchesDays);
        const trendingSearchesDays = data.default.trendingSearchesDays;
        trendingSearchesDays.forEach(day => {
            const dateElement = document.createElement('h4');
            dateElement.textContent = day.formattedDate;
            trendsSection.appendChild(dateElement);

            const trendingSearches = day.trendingSearches;
            trendingSearches.forEach(search => {
                const searchElement = document.createElement('div');
                searchElement.classList.add('trend-item');

                const title = document.createElement('h3');
                title.textContent = search.title.query;
                searchElement.appendChild(title);

                const traffic = document.createElement('p');
                traffic.textContent = `Traffic: ${search.formattedTraffic}`;
                searchElement.appendChild(traffic);

                if (search.articles && Array.isArray(search.articles)) {
                    const articles = document.createElement('ul');
                    search.articles.forEach(article => {
                        const articleItem = document.createElement('li');
                        const articleLink = document.createElement('a');
                        articleLink.href = article.url;
                        articleLink.textContent = article.title;
                        articleLink.target = '_blank';
                        articleItem.appendChild(articleLink);
                        articles.appendChild(articleItem);
                    });
                    searchElement.appendChild(articles);
                }

                trendsSection.appendChild(searchElement);
            });
        });
    } 
    // Check if the data structure is for real-time trends
    else if (data.storySummaries && data.storySummaries.trendingStories && Array.isArray(data.storySummaries.trendingStories)) {
        console.log('Processing real-time trends data');
        console.log('Real-Time Trends Data:', data.storySummaries.trendingStories);
        const trendingStories = data.storySummaries.trendingStories;
        trendingStories.forEach(story => {
            const storyElement = document.createElement('div');
            storyElement.classList.add('trend-item');

            const title = document.createElement('h3');
            title.textContent = story.title;
            storyElement.appendChild(title);

            const traffic = document.createElement('p');
            traffic.textContent = `Traffic: ${story.formattedTraffic || 'N/A'}`;
            storyElement.appendChild(traffic);

            if (story.articles && Array.isArray(story.articles)) {
                const articles = document.createElement('ul');
                story.articles.forEach(article => {
                    const articleItem = document.createElement('li');
                    const articleLink = document.createElement('a');
                    articleLink.href = article.url;
                    articleLink.textContent = article.articleTitle;
                    articleLink.target = '_blank';
                    articleItem.appendChild(articleLink);

                    const articleSource = document.createElement('p');
                    articleSource.textContent = `Source: ${article.source}`;
                    articleItem.appendChild(articleSource);

                    const articleTime = document.createElement('p');
                    articleTime.textContent = `Time: ${article.time}`;
                    articleItem.appendChild(articleTime);

                    const articleSnippet = document.createElement('p');
                    articleSnippet.textContent = article.snippet;
                    articleItem.appendChild(articleSnippet);

                    articles.appendChild(articleItem);
                });
                storyElement.appendChild(articles);
            }

            trendsSection.appendChild(storyElement);
        });
    } 
    // Handle unexpected data format
    else {
        trendsSection.innerHTML = '<p>Unexpected data format received.</p>';
        console.error('Unexpected data format:', data);
    }
};

// Function to fetch Reddit top posts based on time period
const fetchRedditData = async (timePeriod = 'day') => {
    if (timePeriod !== 'day' && timePeriod !== 'week') {
        throw new Error('Invalid time period specified');
    }

    const redditUrl = `https://www.reddit.com/top.json?sort=top&t=${timePeriod}`;

    try {
        const response = await axios.get(redditUrl);

        if (response.data && response.data.data && response.data.data.children) {
            return response.data.data.children
                .filter(child => child.kind === 't3') // Filter out non-posts
                .slice(0, 5) // Take only the top 5 posts
                .map(child => ({
                    title: child.data.title,
                    permalink: child.data.permalink,
                    score: child.data.score,
                    preview: child.data.preview,
                    media: child.data.media
                }));
        } else {
            throw new Error('Invalid Reddit API response format');
        }
    } catch (error) {
        console.error('Error fetching Reddit data:', error);
        throw error;
    }
};

let financeChart;

// Function to update UI with financial data
function updateFinance(data) {
    const container = document.querySelector('#finance .data-container');
    if (data.error) {
        container.innerHTML = '<p>Unable to fetch financial data.</p>';
        return;
    }

    // Debugging: Log the data to ensure it's correct
    console.log('Finance data:', data);

    container.innerHTML = `
        <h3>Stock Market Overview (${data.symbol})</h3>
        <canvas id="financeChart"></canvas>
    `;

    const ctx = document.getElementById('financeChart').getContext('2d');
    if (financeChart) {
        financeChart.destroy();
    }

    let timeUnit;
    switch (data.timeRange) {
        case '1m':
            timeUnit = 'minute';
            break;
        case '1h':
            timeUnit = 'hour';
            break;
        case '1d':
            timeUnit = 'minute';
            break;
        case '5d':
            timeUnit = 'hour';
            break;
        case '1mo':
            timeUnit = 'day';
            break;
        case '1y':
            timeUnit = 'week';
            break;
        default:
            timeUnit = 'day';
    }

    // Ensure data.dates and data.prices are arrays and have the same length
    if (!Array.isArray(data.dates) || !Array.isArray(data.prices) || data.dates.length !== data.prices.length) {
        console.error('Invalid data format for chart:', data);
        container.innerHTML = '<p>Invalid data format for chart.</p>';
        return;
    }

    // Check if data is empty or has only one data point
    if (data.dates.length === 0 || data.prices.length === 0) {
        console.error('No data available for chart:', data);
        container.innerHTML = '<p>No data available for chart.</p>';
        return;
    }

    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [{
                label: `${data.symbol} Closing Prices`,
                data: data.prices,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            }]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'xy',
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Price: $${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: timeUnit
                    }
                }
            }
        }
    });
}

async function refreshFinanceData(symbol, timeRange, interval) {
    const financeData = await fetchFinancialData(symbol, timeRange, interval);
    updateFinance(financeData);
}

// Function to update UI with news data
function updateNews(data) {
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

// Function to update UI with Reddit data
function updateReddit(data) {
    const container = document.querySelector('#reddit .data-container');

    if (!data || data.length === 0) {
        container.innerHTML = '<p>No Reddit posts found.</p>';
        return;
    }

    container.innerHTML = `
        <h3>Top Reddit Posts</h3>
        <ul>
            ${data.map(post => `
                <li style="margin-bottom: 20px;">
                    <a href="https://www.reddit.com${post.permalink}" target="_blank">${post.title}</a>
                    <p>Score: ${post.score}</p>
                    ${renderMedia(post)}
                </li>
            `).join('')}
        </ul>
    `;
}

// Function to render media attachments (images or videos)
function renderMedia(post) {
    let mediaHtml = '';

    // Check if post has media information
    if (post.preview && post.preview.images && post.preview.images.length > 0) {
        // Render images if available
        const imageSrc = post.preview.images[0].source.url.replace('&amp;', '&');
        mediaHtml += `<img src="${imageSrc}" alt="Reddit Image" style="max-width: 100%;"><br>`;
    }

    // Render videos if available
    if (post.media && post.media.reddit_video && post.media.reddit_video.fallback_url) {
        const videoSrc = post.media.reddit_video.fallback_url;
        mediaHtml += `
            <video controls style="max-width: 100%;">
                <source src="${videoSrc}" type="video/mp4">
                Your browser does not support the video tag.
            </video><br>`;
    }

    return mediaHtml;
}

// Function to show loading state in a container
function showLoading(container) {
    container.innerHTML = '<p>Loading...</p>';
}

// Define variables to track pause state for each module
let isPaused = {
    'finance': false,
    'news': false,
    'traffic': false,
    'trends': false,
    'reddit': false
};

// Function to toggle pause state for a module
function togglePause(module) {
    isPaused[module] = !isPaused[module];
    
    const button = document.querySelector(`#${module} .pause-button`);
    button.textContent = isPaused[module] ? 'Resume' : 'Pause';
    button.classList.toggle('paused', isPaused[module]); // Add or remove 'paused' class
    
    console.log(`${module} data fetching is ${isPaused[module] ? 'paused' : 'resumed'}.`);
    
    if (!isPaused[module]) {
        refreshData(module);
    }
}

// Function to refresh data for a module
async function refreshData(module) {
    const container = document.querySelector(`#${module} .data-container`);
    showLoading(container);
    
    try {
        let data;
        switch (module) {
            case 'news':
                data = await fetchNewsData();
                updateNews(data);
                break;
            case 'finance':
                data = await fetchFinancialData();
                updateFinance(data);
                break;
            case 'traffic':
                if (map) {
                    const currentCenter = map.getCenter();
                    data = await updateTrafficInfo({
                        lat: currentCenter.lat(),
                        lng: currentCenter.lng()
                    });
                } else {
                    console.warn('Map not initialized, skipping traffic update');
                    data = { status: 'Map not initialized' };
                }
                updateTrafficUI(data);
                break;
            case 'trends':
                data = await fetchTrendsData('daily');
                updateTrends(data, 'daily');
                break;
            case 'realtime-trends':
                data = await fetchTrendsData('realtime');
                updateTrends(data, 'realtime');
                break;
            case 'reddit':
                data = await fetchRedditData('day'); // Default to 'day' time period for Reddit
                updateReddit(data);
                break;
            default:
                console.log(`Module ${module} not supported.`);
        }
    } catch (error) {
        container.innerHTML = '<p>Error loading data. Please try again later.</p>';
        console.error(`Error fetching ${module} data:`, error);
    }
}

// Update the event listener to handle the new categories
document.addEventListener('DOMContentLoaded', async () => {
    const countrySelect = document.getElementById('countrySelect');
    const languageSelect = document.getElementById('languageSelect');
    const trendsCountrySelect = document.getElementById('trendsCountrySelect');
    const trendsLanguageSelect = document.getElementById('trendsLanguageSelect');

    if (!countrySelect || !languageSelect || !trendsCountrySelect || !trendsLanguageSelect) {
        console.error('One or more elements not found in the DOM');
        return;
    }

    const buttons = {
        'localNewsButton': ['news', 'local'],
        'worldNewsButton': ['news', 'world'],
        'techNewsButton': ['news', 'technology'],
        'financeNewsButton': ['news', 'finance'],
        'sportsNewsButton': ['news', 'sports'],
        'eventsNewsButton': ['news', 'events'],
        'otherNewsButton': ['news', 'other'],
        'dayRedditButton': ['reddit', 'day'],
        'weekRedditButton': ['reddit', 'week'],
        'dailyTrendsButton': ['trends', 'daily'],
        'realtimeTrendsButton': ['trends', 'realtime'],
        'techTrendsButton': ['trends', 'realtime', 't'],
        'businessTrendsButton': ['trends', 'realtime', 'b'],
        'financeTrendsButton': ['trends', 'realtime', 'f']
    };

    Object.entries(buttons).forEach(([id, [type, category, subCategory]]) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', async () => {
                const country = type === 'trends' ? trendsCountrySelect.value : countrySelect.value;
                const language = type === 'trends' ? trendsLanguageSelect.value : languageSelect.value;
                const data = await (type === 'news' ? fetchNewsData(category, country, language) :
                                     type === 'reddit' ? fetchRedditData(category) :
                                     fetchTrendsData(category, subCategory, country));
                if (type === 'trends') {
                    updateTrends(data, category);
                } else {
                    window[`update${type.charAt(0).toUpperCase() + type.slice(1)}`](data);
                }
            });
        } else {
            console.warn(`Button with ID ${id} not found`);
        }
    });

    // Add event listener for country select to update Google Trends data
    trendsCountrySelect.addEventListener('change', async () => {
        const country = trendsCountrySelect.value;
        const trendsData = await fetchTrendsData('daily', 'all', country);
        updateTrends(trendsData, 'daily');
    });

    // Fetch and display world news and top Reddit posts of the day by default
    try {
        const country = countrySelect.value;
        const language = languageSelect.value;

        const newsData = await fetchNewsData('world', country, language);
        updateNews(newsData);

        const redditData = await fetchRedditData('day');
        updateReddit(redditData);

        const trendsData = await fetchTrendsData('daily', 'all', trendsCountrySelect.value);
        updateTrends(trendsData, 'daily');

        await refreshRealTimeFinanceData('AAPL'); // Fetch real-time data for Apple Inc.

        // Set up periodic updates every minute
        setInterval(() => refreshRealTimeFinanceData('AAPL'), 60000);
    } catch (error) {
        console.error('Error during initial data fetch:', error);
    }

    // Theme toggle functionality
    const themeToggleButton = document.getElementById('themeToggleButton');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
        });
    } else {
        console.warn('Theme toggle button not found');
    }

    const stockSymbolInput = document.getElementById('stockSymbolInput');
    const dailyButton = document.getElementById('dailyButton');
    const weeklyButton = document.getElementById('weeklyButton');
    const monthlyButton = document.getElementById('monthlyButton');
    const yearlyButton = document.getElementById('yearlyButton');
    const minutelyButton = document.getElementById('minutelyButton');
    const hourlyButton = document.getElementById('hourlyButton');

    const updateFinanceData = (timeRange, interval) => {
        const symbol = stockSymbolInput.value || 'AAPL';
        refreshFinanceData(symbol, timeRange, interval);
    };

    if (dailyButton) dailyButton.addEventListener('click', () => updateFinanceData('1d', '1m'));
    if (weeklyButton) weeklyButton.addEventListener('click', () => updateFinanceData('5d', '1h'));
    if (monthlyButton) monthlyButton.addEventListener('click', () => updateFinanceData('1mo', '1d'));
    if (yearlyButton) yearlyButton.addEventListener('click', () => updateFinanceData('1y', '1wk'));
    if (minutelyButton) minutelyButton.addEventListener('click', () => updateFinanceData('1d', '1m'));
    if (hourlyButton) hourlyButton.addEventListener('click', () => updateFinanceData('1d', '1h'));

    // Fetch and display default stock data
    await refreshFinanceData('AAPL', '1d', '1m');
});


// Make sure to call loadGoogleMapsScript in your initialization code
loadGoogleMapsScript().catch(error => {
    console.error('Error initializing map:', error);
});