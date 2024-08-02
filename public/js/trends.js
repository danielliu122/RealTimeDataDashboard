// trends.js

// Function to decode HTML entities
const decodeHtmlEntities = (text) => {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = text;
    return tempElement.textContent || tempElement.innerText || '';
};

// Function to fetch Google Trends data
export const fetchTrendsData = async (type = 'daily', category = 'all', country = '') => {
    try {
        const response = await fetch(`/api/trends?type=${type}&category=${category}&country=${country}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
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
export const updateTrends = (data, category) => {
    const trendsSection = document.querySelector('#trends .data-container');
    trendsSection.innerHTML = ''; // Clear previous data

    if (data.error) {
        trendsSection.innerHTML = `<p>${data.error}</p>`;
        return;
    }

    console.log('Trends Data:', data);

    let topics = [];
    if (data.default && data.default.trendingSearchesDays && Array.isArray(data.default.trendingSearchesDays)) {
        console.log('Processing daily trends data');
        console.log('Daily Trends Data:', data.default.trendingSearchesDays);
        const trendingSearchesDays = data.default.trendingSearchesDays;
        trendingSearchesDays.forEach(day => {
            const trendingSearches = day.trendingSearches;
            topics = topics.concat(trendingSearches);
        });
    } else if (data.storySummaries && data.storySummaries.trendingStories && Array.isArray(data.storySummaries.trendingStories)) {
        console.log('Processing real-time trends data');
        console.log('Real-Time Trends Data:', data.storySummaries.trendingStories);
        topics = data.storySummaries.trendingStories;
    } else {
        trendsSection.innerHTML = '<p>Unexpected data format received.</p>';
        console.error('Unexpected data format:', data);
        return;
    }

    // Limit total topics to 25
    topics = topics.slice(0, 25);

    // Pagination
    let currentPage = 1;
    const totalPages = topics.length;

    const renderPage = (page) => {
        trendsSection.innerHTML = ''; // Clear previous data
        const topic = topics[page - 1];

        console.log('Current Topic:', topic); // Debugging: log the current topic

        const topicElement = document.createElement('div');
        topicElement.classList.add('trend-item');

        // Determine the title based on the data format
        let topicTitle;
        if (typeof topic.title === 'object' && topic.title.query) {
            topicTitle = topic.title.query;
        } else if (typeof topic.title === 'string') {
            topicTitle = topic.title;
        } else if (typeof topic.query === 'string') {
            topicTitle = topic.query;
        } else {
            topicTitle = 'No Title';
        }

        const title = document.createElement('h4');
        title.textContent = decodeHtmlEntities(topicTitle);
        topicElement.appendChild(title);

        const traffic = document.createElement('p');
        traffic.textContent = `Traffic: ${topic.formattedTraffic || 'N/A'}`;
        topicElement.appendChild(traffic);

        // Handle image for real-time trends
        if (topic.image && topic.image.imgUrl) {
            const image = document.createElement('img');
            image.src = topic.image.imgUrl;
            image.alt = decodeHtmlEntities(topicTitle);
            topicElement.appendChild(image);
        }

        if (topic.articles && Array.isArray(topic.articles)) {
            const articles = document.createElement('ul');
            topic.articles.slice(0, 5).forEach(article => { // Limit to 5 articles per topic
                const articleItem = document.createElement('li');
                const articleLink = document.createElement('a');
                articleLink.href = article.url;
                articleLink.textContent = decodeHtmlEntities(article.title || article.articleTitle);
                articleLink.target = '_blank';
                articleItem.appendChild(articleLink);

                // Handle image for daily trends
                if (article.image && article.image.imageUrl) {
                    const image = document.createElement('img');
                    image.src = article.image.imageUrl;
                    image.alt = decodeHtmlEntities(article.title || article.articleTitle);
                    articleItem.appendChild(image);
                }

                if (article.videoUrl) {
                    const video = document.createElement('video');
                    video.src = article.videoUrl;
                    video.controls = true;
                    articleItem.appendChild(video);
                }

                const snippet = document.createElement('p');
                snippet.textContent = decodeHtmlEntities(article.snippet.split('\n')[0]); // First paragraph
                articleItem.appendChild(snippet);

                articles.appendChild(articleItem);
            });
            topicElement.appendChild(articles);
        }

        trendsSection.appendChild(topicElement);

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

        trendsSection.appendChild(paginationControls);
    };

    renderPage(currentPage);
};