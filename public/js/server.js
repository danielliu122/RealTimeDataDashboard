const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const axios = require('axios');
const googleTrends = require('google-trends-api');
const yahooFinance = require('yahoo-finance2').default;

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../')));

// Basic route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../', 'index.html'));
});

app.get('/api/config', (req, res) => {
    const newsApiKey = process.env.NEWS_API_KEY;
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!newsApiKey || !googleMapsApiKey) {
        console.error('One or more API keys are not set in the environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    res.json({ newsApiKey, googleMapsApiKey});
});

// Route to fetch news data
app.get('/api/news', async (req, res) => {
    const category = req.query.category || 'general';
    const apiKey = process.env.NEWS_API_KEY;
    const url = `https://newsapi.org/v2/top-headlines?category=${category}&apiKey=${apiKey}`;

    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching news data:', error);
        res.status(500).json({ error: 'Error fetching news data' });
    }
});

// Route to fetch Google Trends data
app.get('/api/trends', async (req, res) => {
    const type = req.query.type || 'daily';
    const category = req.query.category || 'all'; // Default to 'all' if no category is provided

    try {
        let trends;
        if (type === 'realtime') {
            trends = await googleTrends.realTimeTrends({
                geo: 'US',
                category: category
            });
        } else {
            trends = await googleTrends.dailyTrends({
                geo: 'US',
                category: category
            });
        }
        res.json(JSON.parse(trends));
    } catch (error) {
        console.error('Error fetching Google Trends data:', error);
        res.status(500).json({ error: 'Error fetching Google Trends data' });
    }
});

// Proxy endpoint to fetch financial data
app.get('/api/finance/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    const range = req.query.range || '1d';
    const interval = req.query.interval || '1d';
    const baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/';
    const url = `${baseUrl}${symbol}?range=${range}&interval=${interval}`;

    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching financial data:', error);
        res.status(500).json({ error: 'Error fetching financial data' });
    }
});

// Catch-all route for undefined routes
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.use(express.json());

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});