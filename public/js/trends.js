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
                title.textContent = decodeHtmlEntities(search.title.query);
                searchElement.appendChild(title);

                const traffic = document.createElement('p');
                traffic.textContent = `Traffic: ${search.formattedTraffic}`;
                searchElement.appendChild(traffic);

                if (search.articles && Array.isArray(search.articles)) {
                    const articles = document.createElement('ul');
                    search.articles.slice(0, 5).forEach(article => { // Limit to 5 articles
                        const articleItem = document.createElement('li');
                        const articleLink = document.createElement('a');
                        articleLink.href = article.url;
                        articleLink.textContent = decodeHtmlEntities(article.title);
                        articleLink.target = '_blank';
                        articleItem.appendChild(articleLink);

                        // Check for image or video URL
                        if (article.image && article.image.imageUrl) {
                            const image = document.createElement('img');
                            image.src = article.image.imageUrl;
                            image.alt = decodeHtmlEntities(article.title);
                            articleItem.appendChild(image);
                        }

                        if (article.videoUrl) {
                            const video = document.createElement('video');
                            video.src = article.videoUrl;
                            video.controls = true;
                            articleItem.appendChild(video);
                        }

                        // Add description/snippet
                        const snippet = document.createElement('p');
                        snippet.textContent = decodeHtmlEntities(article.snippet.split('\n')[0]); // First paragraph
                        articleItem.appendChild(snippet);

                        articles.appendChild(articleItem);
                    });
                    searchElement.appendChild(articles);
                }

                trendsSection.appendChild(searchElement);
            });
        });
    } else if (data.storySummaries && data.storySummaries.trendingStories && Array.isArray(data.storySummaries.trendingStories)) {
        console.log('Processing real-time trends data');
        console.log('Real-Time Trends Data:', data.storySummaries.trendingStories);
        const trendingStories = data.storySummaries.trendingStories;
        trendingStories.forEach(story => {
            const storyElement = document.createElement('div');
            storyElement.classList.add('trend-item');

            const title = document.createElement('h3');
            title.textContent = decodeHtmlEntities(story.title);
            storyElement.appendChild(title);

            const traffic = document.createElement('p');
            traffic.textContent = `Traffic: ${story.formattedTraffic || 'N/A'}`;
            storyElement.appendChild(traffic);

            // Check for image URL in the story object
            if (story.image && story.image.imgUrl) {
                const image = document.createElement('img');
                image.src = story.image.imgUrl;
                image.alt = decodeHtmlEntities(story.title);
                storyElement.appendChild(image);
            }

            if (story.articles && Array.isArray(story.articles)) {
                const articles = document.createElement('ul');
                story.articles.slice(0, 5).forEach(article => { // Limit to 5 articles
                    const articleItem = document.createElement('li');
                    const articleLink = document.createElement('a');
                    articleLink.href = article.url;
                    articleLink.textContent = decodeHtmlEntities(article.articleTitle);
                    articleLink.target = '_blank';
                    articleItem.appendChild(articleLink);

                    // Check for image or video URL
                    if (article.image && article.image.imageUrl) {
                        const image = document.createElement('img');
                        image.src = article.image.imageUrl;
                        image.alt = decodeHtmlEntities(article.articleTitle);
                        articleItem.appendChild(image);
                    }

                    if (article.videoUrl) {
                        const video = document.createElement('video');
                        video.src = article.videoUrl;
                        video.controls = true;
                        articleItem.appendChild(video);
                    }

                    const articleSource = document.createElement('p');
                    articleSource.textContent = `Source: ${article.source}`;
                    articleItem.appendChild(articleSource);

                    const articleTime = document.createElement('p');
                    articleTime.textContent = `Time: ${article.time}`;
                    articleItem.appendChild(articleTime);

                    const articleSnippet = document.createElement('p');
                    articleSnippet.textContent = decodeHtmlEntities(article.snippet.split('\n')[0]); // First paragraph
                    articleItem.appendChild(articleSnippet);

                    articles.appendChild(articleItem);
                });
                storyElement.appendChild(articles);
            }

            trendsSection.appendChild(storyElement);
        });
    } else {
        trendsSection.innerHTML = '<p>Unexpected data format received.</p>';
        console.error('Unexpected data format:', data);
    }
};