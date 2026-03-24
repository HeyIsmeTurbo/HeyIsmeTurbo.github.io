const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const search = require('yt-search');

const app = express();
const PORT = process.env.PORT || 3000;

// YouTube Music Video Search (no playlist mode)
console.log('✓ Music Search Mode: Searching YouTube for music videos with 5M+ views');
let searchCache = {};
let searchCacheTime = {};
const CACHE_DURATION = 3600000; // 1 hour

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Step 1: Analyze image only
app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    console.log('📸 Analyzing image...');
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Get image description using Hugging Face API
    const imageDescription = await analyzeImage(base64Image);
    console.log('✅ Image analysis complete:', imageDescription);

    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    res.json({
      success: true,
      description: imageDescription
    });
  } catch (error) {
    console.error('Error analyzing image:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Step 2: Search for music based on image description
app.post('/search', async (req, res) => {
  try {
    console.log('🎵 Searching for music...');
    
    const imageDescription = req.body.description || '';
    const searchQuery = req.body.searchQuery || '';
    
    // Parse user settings from request body
    const userSettings = {
      minViews: parseInt(req.body.minViews) || 5000000,
      keywords: req.body.keywords ? req.body.keywords.split(',').map(k => k.trim().toLowerCase()) : ['mv', 'music video'],
      resultsCount: parseInt(req.body.resultsCount) || 50,
      searchQuery: searchQuery
    };
    
    console.log('⚙️ User settings:', userSettings);

    // Generate music search query based on image mood
    let musicQuery = userSettings.searchQuery || generateMusicQuery(imageDescription);
    console.log('🔍 Search query:', musicQuery);

    // Search YouTube for music videos with user settings
    console.log(`Searching YouTube for music videos (min ${userSettings.minViews} views)...`);
    const musicResults = await searchYouTubeMusic(musicQuery, {
      ...userSettings,
      description: imageDescription // Pass description for relevance scoring
    });

    console.log(`✅ Found ${musicResults.length} results`);
    res.json({
      success: true,
      musicQuery: musicQuery,
      results: musicResults
    });
  } catch (error) {
    console.error('Error searching music:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Image upload and music search on YouTube (legacy endpoint for backward compatibility)
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    console.log('📤 Received upload request');
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse user settings from request body
    const userSettings = {
      minViews: parseInt(req.body.minViews) || 5000000,
      keywords: req.body.keywords ? req.body.keywords.split(',').map(k => k.trim().toLowerCase()) : ['mv', 'music video'],
      resultsCount: parseInt(req.body.resultsCount) || 50,
      searchQuery: req.body.searchQuery || ''
    };
    
    console.log('⚙️ User settings:', userSettings);

    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Get image description using Hugging Face API
    console.log('Analyzing image...');
    const imageDescription = await analyzeImage(base64Image);
    console.log('Image description:', imageDescription);

    // Generate music search query based on image mood
    console.log('Generating music search query...');
    let musicQuery = userSettings.searchQuery || generateMusicQuery(imageDescription);
    console.log('Search query:', musicQuery);

    // Search YouTube for music videos with user settings
    console.log(`Searching YouTube for music videos (min ${userSettings.minViews} views)...`);
    const musicResults = await searchYouTubeMusic(musicQuery, {
      ...userSettings,
      description: imageDescription // Pass description for relevance scoring
    });

    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    console.log(`✅ Sending response with ${musicResults.length} results`);
    res.json({
      success: true,
      description: imageDescription,
      musicQuery: musicQuery,
      results: musicResults
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Analyze image using Hugging Face API (free image captioning)
async function analyzeImage(base64Image) {
  try {
    const HF_API_KEY = process.env.HF_API_KEY || 'hf_dummyKeyForLocalTesting';
    
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base',
      { inputs: base64Image },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data[0] && response.data[0].generated_text) {
      return response.data[0].generated_text;
    }
    return 'atmospheric background music';
  } catch (error) {
    console.log('Hugging Face API error (using fallback):', error.message);
    // Fallback - return a generic description
    return 'beautiful atmospheric music';
  }
}

// Generate music search query based on image description
function generateMusicQuery(description) {
  // Extract key words (remove common words)
  const commonWords = ['a', 'an', 'the', 'and', 'or', 'is', 'are', 'with', 'in', 'on', 'at', 'to', 'for'];
  const words = description.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word))
    .slice(0, 5); // Take top 5 content words
  
  // Create primary search query combining key words + music video
  const primaryQuery = words.length > 0 
    ? `${words.join(' ')} music video`
    : `${description} music video`;
  
  return primaryQuery;
}

// Calculate relevance score for a video based on search terms
function calculateRelevanceScore(video, description, keywords) {
  let score = 0;
  const titleLower = (video.title || '').toLowerCase();
  const descriptionLower = description.toLowerCase();
  
  // Extract key words from description
  const commonWords = ['a', 'an', 'the', 'and', 'or', 'is', 'are', 'with', 'in', 'on', 'at', 'to'];
  const descriptionWords = descriptionLower
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word));
  
  // Score based on how many description words appear in title (highest priority)
  let matchingWords = 0;
  descriptionWords.forEach(word => {
    if (titleLower.includes(word)) {
      matchingWords++;
      score += 50; // Heavy weight for description word matches
    }
  });
  
  // Bonus for multiple matching words (indicates good relevance)
  if (matchingWords >= 2) {
    score += 100;
  }
  
  // Score based on keywords
  keywords.forEach(keyword => {
    if (titleLower.includes(keyword.toLowerCase())) {
      score += 30;
    }
  });
  
  // Extract and normalize view count
  const viewsText = video.views || '0';
  const viewsNum = parseInt(viewsText.toString().replace(/[^0-9]/g, '')) || 0;
  
  // Higher view count = slight relevance boost (but not main factor)
  if (viewsNum > 100000000) score += 20; // 100M+
  else if (viewsNum > 50000000) score += 15; // 50M+
  else if (viewsNum > 10000000) score += 10; // 10M+
  
  return score;
}

// Search YouTube for music videos with filters and fallback retry strategies
async function searchYouTubeMusic(query, userSettings = {}) {
  try {
    // Use settings defaults if not provided
    let minViews = userSettings.minViews || 5000000;
    const keywords = userSettings.keywords || ['mv', 'music video'];
    const resultsCount = userSettings.resultsCount || 50;
    const description = userSettings.description || query;
    const originalMinViews = minViews;

    // Check cache
    const now = Date.now();
    const cacheKey = `${query}_${minViews}_${keywords.join(',')}`;
    if (searchCache[cacheKey] && (now - searchCacheTime[cacheKey]) < CACHE_DURATION) {
      console.log('Using cached search results');
      return searchCache[cacheKey];
    }

    // Strategy 1: Try with original query and strict filters
    console.log(`[Strategy 1] Searching YouTube for: "${query}" (${minViews}+ views)`);
    let results = await search(query);
    let scoredVideos = await filterAndScoreVideos(results, keywords, description, minViews, userSettings, resultsCount);

    // Strategy 2: Relax view count requirement (50% of original)
    if (scoredVideos.length === 0) {
      minViews = Math.max(100000, Math.floor(originalMinViews * 0.5));
      console.log(`[Strategy 2] No results found. Retrying with relaxed view count (${minViews}+ views)`);
      results = await search(query);
      scoredVideos = await filterAndScoreVideos(results, keywords, description, minViews, userSettings, resultsCount);
    }

    // Strategy 3: Remove view requirement, just use keywords
    if (scoredVideos.length === 0) {
      console.log(`[Strategy 3] Still no results. Searching with keywords only (no view requirement)`);
      results = await search(query);
      scoredVideos = await filterAndScoreVideos(results, keywords, description, 0, userSettings, resultsCount);
    }

    // Strategy 4: Try simpler query - just first few words
    if (scoredVideos.length === 0) {
      const simpleQuery = query.split(' ').slice(0, 3).join(' ');
      console.log(`[Strategy 4] Simplifying query to: "${simpleQuery}"`);
      results = await search(simpleQuery);
      scoredVideos = await filterAndScoreVideos(results, keywords, description, 0, userSettings, resultsCount);
    }

    // Strategy 5: Try just keywords (ignore description)
    if (scoredVideos.length === 0) {
      const keywordQuery = keywords[0] + ' music video';
      console.log(`[Strategy 5] Using keyword fallback: "${keywordQuery}"`);
      results = await search(keywordQuery);
      scoredVideos = await filterAndScoreVideos(results, keywords, description, 0, userSettings, resultsCount);
    }

    // Strategy 6: Ultra-fallback - broad music video search
    if (scoredVideos.length === 0) {
      console.log(`[Strategy 6] Ultra-fallback: Searching for "music video"`);
      results = await search('music video');
      const allVideos = results.videos || [];
      scoredVideos = allVideos
        .slice(0, resultsCount)
        .map(video => ({
          title: video.title,
          url: video.url,
          videoId: video.videoId,
          duration: video.duration,
          thumbnail: video.thumbnail,
          author: video.author?.name || 'Unknown',
          views: video.views || 'Unknown'
        }));
    }

    // If still no results, try one more time with just "music"
    if (scoredVideos.length === 0) {
      console.log(`[Strategy 7] Final fallback: Searching for "music"`);
      results = await search('music');
      const allVideos = results.videos || [];
      scoredVideos = allVideos
        .slice(0, resultsCount)
        .map(video => ({
          title: video.title,
          url: video.url,
          videoId: video.videoId,
          duration: video.duration,
          thumbnail: video.thumbnail,
          author: video.author?.name || 'Unknown',
          views: video.views || 'Unknown'
        }));
    }

    console.log(`✓ Found ${scoredVideos.length} music videos on YouTube`);

    if (scoredVideos.length === 0) {
      throw new Error('Unable to find any videos on YouTube. Please try again.');
    }

    // Cache the results
    searchCache[cacheKey] = scoredVideos;
    searchCacheTime[cacheKey] = now;

    return scoredVideos;
  } catch (error) {
    console.error('YouTube search error:', error.message);
    throw new Error('Failed to search YouTube: ' + error.message);
  }
}

// Helper function to filter and score videos
async function filterAndScoreVideos(results, keywords, description, minViews, userSettings, resultsCount) {
  if (!results || !results.videos || results.videos.length === 0) {
    return [];
  }

  const scoredVideos = results.videos
    .filter(video => {
      // If no keywords specified, accept all videos (fallback mode)
      if (keywords.length === 0) {
        return true;
      }

      // Must contain at least one of the user's keywords in title
      const titleLower = (video.title || '').toLowerCase();
      const hasKeyword = keywords.some(keyword => titleLower.includes(keyword.toLowerCase()));
      
      if (!hasKeyword) {
        return false;
      }

      // Must have minimum views (if minViews > 0)
      if (minViews > 0) {
        const viewsText = video.views || '0';
        const viewsNum = parseInt(viewsText.toString().replace(/[^0-9]/g, '')) || 0;
        
        if (viewsNum < minViews) {
          return false;
        }
      }

      return true;
    })
    .map(video => ({
      video: video,
      score: calculateRelevanceScore(video, description, keywords)
    }))
    // Filter out rejected videos (with -Infinity score)
    .filter(({ score }) => isFinite(score))
    // Sort by relevance score (highest first)
    .sort((a, b) => b.score - a.score)
    .slice(0, resultsCount)
    .map(({ video }) => ({
      title: video.title,
      url: video.url,
      videoId: video.videoId,
      duration: video.duration,
      thumbnail: video.thumbnail,
      author: video.author?.name || 'Unknown',
      views: video.views || 'Unknown'
    }));

  return scoredVideos;
}

// Start server with fallback ports
function startServer(portNumber = 3000) {
  if (portNumber > 3010) {
    console.error('Failed to start server on ports 3000-3010');
    process.exit(1);
  }

  const server = app.listen(portNumber, () => {
    console.log(`✓ Server running at http://localhost:${portNumber}`);
    console.log('Upload an image to find matching YouTube music videos!');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${portNumber} is in use, trying port ${portNumber + 1}...`);
      startServer(portNumber + 1);
    } else {
      console.error('Server error:', error);
      process.exit(1);
    }
  });
}

startServer();
