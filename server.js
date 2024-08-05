const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const axios = require('axios');
const googleTrends = require('google-trends-api');
const yahooFinance = require('yahoo-finance2').default;
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const geoip = require('geoip-lite');

const app = express();
const port = process.env.PORT || 3000;
const newsCache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Rate limiter middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    skip: (req) => {
        const ip = req.ip;
        const devIp = process.env.DEV_IP || '127.0.0.1';
        return ip === '127.0.0.1' || ip === '::1' || ip === devIp;
    }
});

// Geo-restrictor middleware
const restrictedCountries = [
    'RU', 'CN', 'KP', 'IR', 'NG', 'UA', 'BR', 'BI', 'AF', 'SD', 'CD', 'VE', 'CU',
];

const geoRestrictor = (req, res, next) => {
    const ip = req.ip;
    const geo = geoip.lookup(ip);
    if (geo && restrictedCountries.includes(geo.country)) {
        return res.status(403).json({ error: 'Access restricted from your location' });
    }
    next();
};

// Apply rate limiter and geo-restrictor to all routes
app.use(limiter);
app.use(geoRestrictor);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to fetch news data
app.get('/api/news', async (req, res) => {
    const newsApiKey = process.env.NEWS_API_KEY;
    const { category, country, language } = req.query;

    if (!newsApiKey) {
        console.error('News API key is not set in the environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const newsUrl = `https://newsapi.org/v2/top-headlines?category=${category}&country=${country}&language=${language}&apiKey=${newsApiKey}`;

    try {
        const response = await axios.get(newsUrl);
        if (response.status === 200 && response.data) {
            res.json(response.data);
        } else {
            res.status(response.status).json({ error: 'Error fetching news data' });
        }
    } catch (error) {
        console.error('Error fetching news data:', error);
        res.status(500).json({ error: 'Error fetching news data' });
    }
});

// Route to fetch Google Trends data
app.get('/api/trends', async (req, res) => {
    const type = req.query.type || 'daily';
    const geo = req.query.geo || 'US';
    const category = req.query.category || 'all'; // Default to 'all' if no category is provided

    try {
        let trends;
        if (type === 'realtime') {
            trends = await googleTrends.realTimeTrends({
                geo: geo,
                category: category
            });
        } else if (type === 'daily') {
            trends = await googleTrends.dailyTrends({
                geo: geo,
                category: category
            });
        } else {
            return res.status(400).json({ error: 'Invalid trend type' });
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

// New endpoint to proxy Google Maps script
app.get('/api/googlemaps/script', (req, res) => {
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!googleMapsApiKey) {
        console.error('Google Maps API key is not set in the environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&loading=async&callback=initMap&libraries=places,geometry`;
    res.redirect(scriptUrl);
});

// Catch-all route for undefined routes
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.use(express.json());

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});