// app.js
// The 'require' statement is not needed in browser-side JavaScript.
// Configuration is now fetched from the server.

import { loadGoogleMapsScript, initMap, startPeriodicTrafficUpdates, updateTrafficInfo } from './map.js';
import { fetchFinancialData, fetchRealTimeYahooFinanceData, updateRealTimeFinance, refreshRealTimeFinanceData, updateFinance, updateFinanceDataWithPercentage } from './finance.js';
import { fetchNewsData, updateNews } from './news.js';
import { fetchTrendsData, updateTrends } from './trends.js'; // Import from trends.js
import { fetchRedditData, updateReddit } from './reddit.js'; // Import from reddit.js

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

// Function to update finance data
function updateFinanceData(timeRange, interval) {
    console.log(`updateFinanceData called with timeRange: ${timeRange}, interval: ${interval}`);
    const stockSymbolInput = document.getElementById('stockSymbolInput');
    const symbol = stockSymbolInput.value || 'AAPL';
    console.log(`Refreshing finance data for symbol: ${symbol}`);
    updateFinanceDataWithPercentage(symbol, timeRange, interval)
        .catch(error => console.error('Error updating finance data:', error));
}

// Attach functions to the window object to make them globally accessible
window.handleButtonClick = handleButtonClick;
window.updateFinanceData = updateFinanceData;
window.togglePauseFinance = togglePauseFinance;
window.refreshNews = refreshNews;
window.refreshTrends = refreshTrends;

document.addEventListener('DOMContentLoaded', async () => {
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

    // Fetch and display default stock data
    await updateFinanceDataWithPercentage('AAPL', '1d', '1m');

    // Update the event listeners for the time range buttons
    document.getElementById('minutelyButton').addEventListener('click', () => updateFinanceData('1d', '1m'));
    document.getElementById('hourlyButton').addEventListener('click', () => updateFinanceData('1d', '60m'));
    document.getElementById('dailyButton').addEventListener('click', () => updateFinanceData('1mo', '1d'));
    document.getElementById('weeklyButton').addEventListener('click', () => updateFinanceData('3mo', '1wk'));
    document.getElementById('monthlyButton').addEventListener('click', () => updateFinanceData('1y', '1mo'));
});

// Make sure to call loadGoogleMapsScript in your initialization code
loadGoogleMapsScript().catch(error => {
    console.error('Error initializing map:', error);
});