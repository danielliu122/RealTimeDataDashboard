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

// Update fetchNewsData function to accept a parameter for news type
const fetchNewsData = async (type = 'world') => {
    const categoryMap = {
        'world': 'general',
        'local': 'general',
        'technology': 'technology',
        'finance': 'business',
        'sports': 'sports',
        'events': 'entertainment',
        'other': 'general'
    };

    const newsUrl = type === 'local' 
        ? `https://newsapi.org/v2/top-headlines?country=us` 
        : `https://newsapi.org/v2/top-headlines?category=${categoryMap[type]}`;

    try {
        const config = await fetchData('/api/config');
        if (!config.newsApiKey) {
            throw new Error('News API key is not available');
        }
        const response = await fetch(newsUrl, {
            headers: { 'X-Api-Key': config.newsApiKey }
        });
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('News API key is invalid or has expired.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
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

// Function to fetch financial data (define this function)
const fetchFinancialData = async () => {
    // Replace with actual financial data fetching logic
    console.log('Fetching financial data...');
    return {
        sp500: 4500,
        dowJones: 35000,
        nasdaq: 15000
    };
};

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
const fetchTrendsData = async (type = 'daily') => {
    try {
        const response = await fetch(`/api/trends?type=${type}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching trends data:', error);
        return { error: 'Unable to fetch trends data' };
    }
};

// Function to update UI with trends data
function updateTrends(data, type) {
    const container = document.querySelector('#trends .data-container');
    if (!data || data.error) {
        container.innerHTML = '<p>Unable to fetch trends data.</p>';
        return;
    }

    if (type === 'realtime') {
        if (!data.storySummaries || !data.storySummaries.trendingStories) {
            container.innerHTML = '<p>No real-time trends data available.</p>';
            return;
        }

        container.innerHTML = `
            <h3>Real-Time Google Trends</h3>
            <ol>
                ${data.storySummaries.trendingStories.map(story => `
                    <li>${story.title}</li>
                `).join('')}
            </ol>
        `;
    } else {
        if (!data.default || !data.default.trendingSearchesDays) {
            container.innerHTML = '<p>No daily trends data available.</p>';
            return;
        }

        container.innerHTML = `
            <h3>Daily Google Trends</h3>
            <ol>
                ${data.default.trendingSearchesDays[0].trendingSearches.map(search => `
                    <li>${search.title.query}</li>
                `).join('')}
            </ol>
        `;
    }
}

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

// Function to update UI with financial data
function updateFinance(data) {
    const container = document.querySelector('#finance .data-container');
    container.innerHTML = `
        <h3>Stock Market Overview</h3>
        <ul>
            <li>S&P 500: ${data.sp500}</li>
            <li>Dow Jones: ${data.dowJones}</li>
            <li>NASDAQ: ${data.nasdaq}</li>
        </ul>
    `;
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

// Update the event listener to handle the toggle
document.addEventListener('DOMContentLoaded', async () => {
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
        'realtimeTrendsButton': ['trends', 'realtime']
    };

    Object.entries(buttons).forEach(([id, [type, category]]) => {
        document.getElementById(id).addEventListener('click', async () => {
            const data = await (type === 'news' ? fetchNewsData(category) :
                                 type === 'reddit' ? fetchRedditData(category) :
                                 fetchTrendsData(category));
            if (type === 'trends') {
                updateTrends(data, category);
            } else {
                window[`update${type.charAt(0).toUpperCase() + type.slice(1)}`](data);
            }
        });
    });

    // Fetch and display world news and top Reddit posts of the day by default
    try {
        const newsData = await fetchNewsData('world');
        updateNews(newsData);

        const redditData = await fetchRedditData('day');
        updateReddit(redditData);

        const trendsData = await fetchTrendsData('daily');
        updateTrends(trendsData, 'daily');
    } catch (error) {
        console.error('Error during initial data fetch:', error);
    }

    // Theme toggle functionality
    const themeToggleButton = document.getElementById('themeToggleButton');
    themeToggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
    });
});

// Make sure to call loadGoogleMapsScript in your initialization code
loadGoogleMapsScript().catch(error => {
    console.error('Error initializing map:', error);
});