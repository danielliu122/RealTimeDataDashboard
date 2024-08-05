// Function to fetch financial data
export const fetchFinancialData = async (symbol = 'AAPL', timeRange = '1d', interval = '1m') => {
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
export const fetchRealTimeYahooFinanceData = async (symbol = 'AAPL') => {
    try {
        const response = await fetch(`/api/finance/${symbol}?range=1d&interval=1m`, {
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
export function updateRealTimeFinance(data) {
    const realTimeContainer = document.querySelector('#finance .real-time-data-container');
    if (data.error) {
        realTimeContainer.innerHTML = '<p>Unable to fetch real-time financial data.</p>';
        return;
    }

    // Update last known values if new data is available
    if (data.change !== undefined && data.changePercent !== undefined) {
        lastKnownChange = data.change;
        lastKnownChangePercent = data.changePercent;
    }

    // Use last known values or 'N/A' if not available
    const price = data.price !== undefined ? data.price.toFixed(2) : 'N/A';
    const timestamp = data.timestamp ? data.timestamp.toLocaleTimeString() : 'N/A';
    const change = lastKnownChange !== null ? lastKnownChange.toFixed(2) : 'N/A';
    const changePercent = lastKnownChangePercent !== null ? lastKnownChangePercent.toFixed(2) : 'N/A';

    const changeColor = lastKnownChange >= 0 ? 'green' : 'red';

    realTimeContainer.innerHTML = `
        <h3>Real-Time Stock Data (${data.symbol})</h3>
        <p>Price: $${price}</p>
        <p>Change: <span style="color: ${changeColor}">$${change} (${changePercent}%)</span></p>
        <p>Last Updated: ${timestamp}</p>
    `;
}

// Function to update UI with financial data
export function updateFinance(data) {
    const chartContainer = document.querySelector('#finance .chart-container');
    if (data.error) {
        chartContainer.innerHTML = '<p>Unable to fetch financial data.</p>';
        return;
    }

    // Debugging: Log the data to ensure it's correct
    console.log('Finance data:', data);

    chartContainer.innerHTML = `
        <canvas id="financeChart"></canvas> <!-- Removed fixed dimensions -->
    `;

    const ctx = document.getElementById('financeChart').getContext('2d');
    if (window.financeChart && typeof window.financeChart.destroy === 'function') {
        console.log('Destroying existing chart');
        window.financeChart.destroy();
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
            timeUnit = 'day';
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
        chartContainer.innerHTML = '<p>Invalid data format for chart.</p>';
        return;
    }

    // Check if data is empty or has only one data point
    if (data.dates.length === 0 || data.prices.length === 0) {
        console.error('No data available for chart:', data);
        chartContainer.innerHTML = '<p>No data available for chart.</p>';
        return;
    }

    console.log('Creating new chart');
    window.financeChart = new Chart(ctx, {
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

// Function to refresh real-time financial data
export async function refreshRealTimeFinanceData(symbol) {
    const financeData = await fetchRealTimeYahooFinanceData(symbol);
    updateRealTimeFinance(financeData);
}

// Function to refresh financial data
export async function refreshFinanceData(symbol, timeRange, interval) {
    try {
        const data = await fetchFinancialData(symbol, timeRange, interval);
        updateFinance(data);
    } catch (error) {
        console.error('Error refreshing financial data:', error);
    }
}

// Function to update both real-time and chart data
export async function updateFinanceData(symbol, timeRange = '1d', interval = '1m') {
    await refreshRealTimeFinanceData(symbol);
    await refreshFinanceData(symbol, timeRange, interval);
}

// Function to calculate change percentage
export function calculateChangePercentage(prices) {
    if (!prices || prices.length < 2) {
        return 0;
    }

    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const changePercentage = ((endPrice - startPrice) / startPrice) * 100;

    return changePercentage;
}

// Function to display change percentage
export function displayChangePercentage(change, changePercentage) {
    const realTimeContainer = document.querySelector('#finance .real-time-data-container');
    if (realTimeContainer) {
        const changeElement = realTimeContainer.querySelector('p:nth-child(3)');
        if (changeElement) {
            const formattedChange = change.toFixed(2);
            const formattedPercentage = changePercentage.toFixed(2);
            const color = change >= 0 ? 'green' : 'red';
            changeElement.innerHTML = `Change: <span style="color: ${color}">$${formattedChange} (${formattedPercentage}%)</span>`;
        }
    }
}

// Function to update finance data with change percentage
export async function updateFinanceDataWithPercentage(symbol, timeRange, interval) {
    try {
        const data = await fetchFinancialData(symbol, timeRange, interval);
        if (data && data.prices && data.prices.length > 1) {
            const changePercentage = calculateChangePercentage(data.prices);
            const change = data.prices[data.prices.length - 1] - data.prices[0];
            
            // Update last known values
            lastKnownChange = change;
            lastKnownChangePercent = changePercentage;
            
            displayChangePercentage(change, changePercentage);
        }
        updateFinance(data);
        
        // Update real-time data as well
        const realTimeData = await fetchRealTimeYahooFinanceData(symbol);
        updateRealTimeFinance(realTimeData);
        
        return data;
    } catch (error) {
        console.error('Error updating finance data:', error);
        throw error;
    }
}

// Declare updateInterval at the top of the file, outside any function
let updateInterval;
let lastKnownChange = null;
let lastKnownChangePercent = null;

// Function to start minutely updates
export function startAutoRefresh(symbol, timeRange, interval) {
    // Stop any existing interval
    stopAutoRefresh();

    // Initial update
    updateFinanceDataWithPercentage(symbol, timeRange, interval);

    // Set up interval for updates every 2-3 seconds only for minutely timeframe
    if (timeRange === '1d' && interval === '1m') {
        updateInterval = setInterval(() => {
            updateFinanceDataWithPercentage(symbol, timeRange, interval);
        }, Math.floor(Math.random() * (3000 - 2000 + 1) + 2000)); // Random interval between 2000-3000 ms
    }
}

// Function to stop minutely updates
export function stopAutoRefresh() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

// Event listener for stock symbol input change
document.getElementById('stockSymbolInput').addEventListener('change', (event) => {
    const symbol = event.target.value.toUpperCase();
    const [timeRange, interval] = document.getElementById('minutelyButton').getAttribute('onclick').match(/updateFinanceData\('[^']*', '([^']*)', '([^']*)'\)/i).slice(1);
    updateFinanceData(symbol, timeRange, interval);
});