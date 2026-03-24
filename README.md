# 🎵 Muusikaline Pilt - Image to Music Converter

A Node.js web application that analyzes uploaded images and automatically finds matching background music on YouTube.

## Features

- 📸 **Image Upload** - Drag & drop or click to upload images
- 🤖 **AI Image Analysis** - Automatically describes the image mood/style
- 🎵 **YouTube Music Search** - Finds matching background music based on image analysis
- ▶️ **Auto-play** - First matching song plays automatically in the background
- 🎨 **Modern UI** - Beautiful responsive interface
- 📱 **Mobile Friendly** - Works on all devices

## How It Works

1. Upload an image (JPEG, PNG, GIF)
2. The app analyzes the image to understand its mood/aesthetic
3. Based on the analysis, it searches YouTube for matching background music
4. Results display with options to play different music choices
5. By default, the first match auto-plays in the background

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install:
- **express** - Web server framework
- **multer** - File upload handling
- **axios** - HTTP requests
- **yt-search** - YouTube search functionality
- **sharp** - Image processing (optional)

### 2. (Optional) Get a Hugging Face API Key

For better image analysis, get a free API key from [Hugging Face](https://huggingface.co/settings/tokens):

1. Sign up at https://huggingface.co
2. Go to Settings → Access Tokens
3. Create a new token (read permission is sufficient)
4. Set the environment variable:

**On Windows:**
```bash
set HF_API_KEY=your_token_here
```

**On macOS/Linux:**
```bash
export HF_API_KEY=your_token_here
```

Without this, the app will use fallback image descriptions (still works, but less accurate).

### 3. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Upload Image**: Drag and drop an image or click the upload area
2. **Analyze & Search**: Click "Find Matching Music"
3. **View Results**: See the image analysis and matching YouTube videos
4. **Play Music**: Click any play button or auto-play first result
5. **Switch Songs**: Click different play buttons to switch background music

## Project Structure

```
muusikaline-pilt/
├── fotomuusika.js       # Main Express server
├── package.json         # Dependencies
├── public/
│   └── index.html       # Frontend HTML/CSS/JS
├── uploads/             # Temporary uploaded images (auto-created)
└── README.md            # This file
```

## API Endpoints

### POST /upload
Uploads an image and searches for matching music

**Request:**
- Form-data with image file

**Response:**
```json
{
  "success": true,
  "description": "A sunset over the ocean",
  "musicQuery": "sunset ambient",
  "results": [
    {
      "title": "Relaxing Sunset Music",
      "url": "https://youtube.com/watch?v=...",
      "videoId": "...",
      "duration": "1:23:45",
      "thumbnail": "...",
      "author": "Music Channel"
    }
  ]
}
```

## Troubleshooting

### Issue: "Module not found" error
**Solution:** Run `npm install` in the project directory

### Issue: Port 3000 already in use
**Solution:** Change the port by setting the PORT environment variable:
```bash
set PORT=3001
npm start
```

### Issue: Poor image analysis
**Solution:** Get a free Hugging Face API key (see Setup section)

### Issue: No YouTube results found
**Solution:** The search query might be too specific. The app will return up to 5 results.

## Customization

### Change default port
Edit `fotomuusika.js` line with `const PORT = process.env.PORT || 3000;`

### Modify mood keywords
Edit the `generateMusicQuery()` function in `fotomuusika.js` to add more mood-to-music mappings

### Adjust video filtering
Edit `searchYouTubeMusic()` function to change duration filters

## Technologies Used

- **Backend**: Node.js, Express.js
- **Image Analysis**: Hugging Face Free API (with fallback)
- **YouTube Search**: yt-search npm package
- **File Upload**: Multer
- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Styling**: Responsive design with CSS Grid/Flexbox

## License

MIT License - Feel free to use and modify

## Notes

- Temporary uploaded images are automatically deleted after processing
- YouTube videos are embedded with autoplay enabled (may require user interaction in some browsers)
- The app respects YouTube's Terms of Service by not downloading videos

---

Enjoy transforming your images into music! 🎵✨
