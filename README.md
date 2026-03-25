# Node.js Card Site - Setup Instructions

## Project Overview
A Node.js web app that displays Star Wars characters as cards with a black and yellow design. Data is fetched from the free Star Wars API (SWAPI).

## Features
- ⭐ Responsive grid layout displaying character cards
- 🎨 Black and yellow color scheme with smooth hover effects
- 📱 Mobile-friendly responsive design
- 🔄 Real-time API data fetching
- ✨ Smooth animations and transitions

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

The app will run on `http://localhost:3000`

## Project Structure
```
cardsite/
├── server.js              # Express server
├── package.json           # Dependencies
├── public/
│   ├── index.html         # Main HTML file
│   ├── css/
│   │   └── style.css      # Black and yellow styling
│   └── js/
│       └── app.js         # API fetching and card rendering
└── README.md              # This file
```

## API Used
- **Star Wars API (SWAPI)**: https://swapi.dev/api/people/
- Free, no authentication required

## Customization

### Change API
Edit the `API_URL` in [public/js/app.js](public/js/app.js#L1) to use a different API endpoint.

### Modify Colors
The main colors are in [public/css/style.css](public/css/style.css):
- Gold: `#ffd700`
- Black backgrounds: `#1a1a1a`, `#2a2a2a`

### Add More Fields
Edit the information displayed in the card by modifying the `infoRows` in [public/js/app.js](public/js/app.js#L34)

## Requirements
- Node.js v14 or higher
- npm

## Troubleshooting

**Port already in use?**
```bash
# Use a different port
PORT=3001 npm start
```

**CORS errors?**
The app includes CORS middleware to handle cross-origin requests from the SWAPI.

Enjoy your Star Wars card site! 🚀
