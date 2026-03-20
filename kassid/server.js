const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const CAT_API_URL = "https://api.thecatapi.com/v1/images/search";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": MIME_TYPES[".json"] });
  res.end(JSON.stringify(data));
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: "File not found" });
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

async function handleApiCats(req, res) {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  const rawLimit = Number(requestUrl.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), 30)
    : 12;

  try {
    const requestCount = Math.ceil(limit / 10);
    const responses = await Promise.all(
      Array.from({ length: requestCount }, () => fetch(`${CAT_API_URL}?limit=10`))
    );

    for (const apiResponse of responses) {
      if (!apiResponse.ok) {
        throw new Error(`Cat API returned status ${apiResponse.status}`);
      }
    }

    const chunks = await Promise.all(responses.map((response) => response.json()));
    const cats = chunks.flat();

    if (!Array.isArray(cats)) {
      throw new Error("Unexpected response format from Cat API");
    }

    sendJson(res, 200, cats.slice(0, limit));
  } catch (error) {
    sendJson(res, 500, {
      error: "Failed to load cat data",
      message: error.message,
    });
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  const requestPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;

  if (requestPath === "/api/cats") {
    await handleApiCats(req, res);
    return;
  }

  const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");
  const filePath = path.join(__dirname, safePath);

  serveFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
