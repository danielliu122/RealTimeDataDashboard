// app.js
// The 'require' statement is not needed in browser-side JavaScript.
// Configuration is now fetched from the server.

import { loadGoogleMapsScript, initMap, startPeriodicTrafficUpdates, updateTrafficInfo } from './map.js';
import { fetchFinancialData, fetchRealTimeYahooFinanceData, updateRealTimeFinance, refreshRealTimeFinanceData, updateFinance, updateFinanceDataWithPercentage, startAutoRefresh, stopAutoRefresh } from './finance.js';
import { fetchNewsData, updateNews } from './news.js';
import { fetchTrendsData, updateTrends } from './trends.js'; // Import from trends.js
import { fetchRedditData, updateReddit } from './reddit.js'; // Import from reddit.js

// Add these functions at the top of your file
let lastUpdateTime = 0;

function isMarketOpen() {
    const now = new Date();
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etNow.getDay();
    const hour = etNow.getHours();
    const minute = etNow.getMinutes();

    // Check if it's a weekday (Monday = 1, Friday = 5)
    if (day >= 1 && day <= 5) {
        // Check if it's between 9:30 AM and 4:00 PM ET
        if ((hour === 9 && minute >= 30) || (hour > 9 && hour < 16) || (hour === 16 && minute === 0)) {
            return true;
        }
    }
    return false;
}

// Modify the updateFinanceData function
function updateFinanceData(timeRange, interval) {
    const now = Date.now();
    if (now - lastUpdateTime < 1000) {
        console.log('Throttling: Update requested too soon');
        return;
    }
    
    lastUpdateTime = now;
    
    console.log(`updateFinanceData called with timeRange: ${timeRange}, interval: ${interval}`);
    const stockSymbolInput = document.getElementById('stockSymbolInput');
    const symbol = stockSymbolInput.value || 'AAPL';
    console.log(`Refreshing finance data for symbol: ${symbol}`);
    
    // Stop any existing auto-refresh
    stopAutoRefresh();
    
    // Update once for all timeframes
    updateFinanceDataWithPercentage(symbol, timeRange, interval)
        .catch(error => console.error('Error updating finance data:', error));
    
    // Start new auto-refresh only for realtime (1d, 1m) timeframe during market hours
    if (timeRange === '1d' && interval === '1m' && isMarketOpen()) {
        startAutoRefresh(symbol, timeRange, interval);
    }
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

// Function to toggle pause state for finance module
function togglePauseFinance() {
    isPaused['finance'] = !isPaused['finance'];
    
    const button = document.querySelector('#finance .pause-button');
    button.textContent = isPaused['finance'] ? 'Resume' : 'Pause';
    button.classList.toggle('paused', isPaused['finance']); // Add or remove 'paused' class
    
    console.log(`Finance data fetching is ${isPaused['finance'] ? 'paused' : 'resumed'}.`);
    
    if (!isPaused['finance']) {
        refreshData('finance');
    }
}

// Function to refresh news data
async function refreshNews() {
    const countrySelect = document.getElementById('countrySelect');
    const languageSelect = document.getElementById('languageSelect');
    const country = countrySelect.value;
    const language = languageSelect.value;

    const newsData = await fetchNewsData('world', country, language, true); // Force refresh
    updateNews(newsData);
}

// Function to refresh trends data
async function refreshTrends() {
    const trendsCountrySelect = document.getElementById('trendsCountrySelect');
    const trendsLanguageSelect = document.getElementById('trendsLanguageSelect');
    const country = trendsCountrySelect.value;
    const language = trendsLanguageSelect.value;

    const trendsData = await fetchTrendsData('daily', 'all', country);
    updateTrends(trendsData, 'daily');
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

// Function to handle button clicks
async function handleButtonClick(type, category, subCategory) {
    console.log(`handleButtonClick called with type: ${type}, category: ${category}, subCategory: ${subCategory}`);
    const countrySelect = document.getElementById('countrySelect');
    const languageSelect = document.getElementById('languageSelect');
    const trendsCountrySelect = document.getElementById('trendsCountrySelect');
    const trendsLanguageSelect = document.getElementById('trendsLanguageSelect');

    const country = type === 'trends' ? trendsCountrySelect.value : countrySelect.value;
    const language = type === 'trends' ? trendsLanguageSelect.value : languageSelect.value;
    console.log(`Country: ${country}, Language: ${language}`);
    let data;
    if (type === 'news') {
        data = await fetchNewsData(category, country, language);
        updateNews(data);
    } else if (type === 'reddit') {
        data = await fetchRedditData(category);
        updateReddit(data);
    } else if (type === 'trends') {
        data = await fetchTrendsData(category, subCategory, country);
        updateTrends(data, category);
    }
}

// Attach functions to the window object to make them globally accessible
window.handleButtonClick = handleButtonClick;
window.updateFinanceData = updateFinanceData;
window.togglePauseFinance = togglePauseFinance;
window.refreshNews = refreshNews;
window.refreshTrends = refreshTrends;

// Function to toggle section visibility
window.toggleSection = function(sectionContentId) {
    const sectionContent = document.getElementById(sectionContentId);
    if (sectionContent.style.display === 'none') {
        sectionContent.style.display = 'block';
    } else {
        sectionContent.style.display = 'none';
    }
};



document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Materialize components
    M.AutoInit();

    const countrySelect = document.getElementById('countrySelect');
    const languageSelect = document.getElementById('languageSelect');
    const trendsCountrySelect = document.getElementById('trendsCountrySelect');
    const trendsLanguageSelect = document.getElementById('trendsLanguageSelect');

    if (!countrySelect || !languageSelect || !trendsCountrySelect || !trendsLanguageSelect) {
        console.error('One or more elements not found in the DOM');
        return;
    }

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

        // Start auto-refresh with default values (minutely) only if the market is open
        if (isMarketOpen()) {
            startAutoRefresh('AAPL', '1d', '1m');
        } else {
            console.log('Market is closed. Auto-refresh will not start.');
            // Update the chart once even if the market is closed
            updateFinanceData('1d', '1m');
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

        // Update the event listeners for the time range buttons
        document.getElementById('realtimeButton').addEventListener('click', () => updateFinanceData('1d', '1m'));
        document.getElementById('hourlyButton').addEventListener('click', () => updateFinanceData('1d', '60m'));
        document.getElementById('dailyButton').addEventListener('click', () => updateFinanceData('1mo', '1d'));
        document.getElementById('weeklyButton').addEventListener('click', () => updateFinanceData('3mo', '1wk'));
        document.getElementById('monthlyButton').addEventListener('click', () => updateFinanceData('1y', '1mo'));
    } catch (error) {
        console.error('Error during initial data fetch:', error);
    }
});

// Make sure to call loadGoogleMapsScript in your initialization code
loadGoogleMapsScript().catch(error => {
    console.error('Error initializing map:', error);
});