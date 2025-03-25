const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const YTDlpWrap = require("yt-dlp-wrap");  // ✅ New yt-dlp Wrapper
const ytDlp = new YTDlpWrap();             // ✅ Auto-detects yt-dlp

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
  origin: "*", // 🚀 Allow All Origins (For Testing)
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const SKYTUBE_FOLDER = path.join(__dirname, 'SkyTube'); // ✅ Folder for downloads

// ✅ Function to check and create SkyTube folder
const ensureSkyTubeFolder = () => {
  if (!fs.existsSync(SKYTUBE_FOLDER)) {
    fs.mkdirSync(SKYTUBE_FOLDER, { recursive: true });
    console.log('SkyTube folder created.');
  }
};

// ✅ Generic Function to Execute yt-dlp
const runYtdlp = (args) => {
  return new Promise((resolve, reject) => {
    let stdoutData = "";
    let stderrData = "";

    const process = ytDlp.exec(args);
    
    process.stdout.on("data", (data) => (stdoutData += data));
    process.stderr.on("data", (data) => (stderrData += data));

    process.on("close", (code) => {
      if (code === 0) {
        resolve(stdoutData.trim());
      } else {
        reject(`yt-dlp Error: ${stderrData}`);
      }
    });
  });
};

// ✅ Get Video Details API
app.get('/videoDetails', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  try {
    const output = await runYtdlp(["-j", url]);  // ✅ yt-dlp JSON Output
    const videoInfo = JSON.parse(output);

    // ✅ Find best video + audio format
    const bestVideo = videoInfo.formats.find(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.ext === 'mp4');

    // ✅ Find best audio-only format
    const bestAudio = videoInfo.formats.find(f => f.acodec !== 'none' && f.vcodec === 'none');

    res.json({
      title: videoInfo.title,
      thumbnail: videoInfo.thumbnail,
      duration: videoInfo.duration,
      bestVideo,
      bestAudio
    });
  } catch (err) {
    console.error('Error fetching video information:', err);
    res.status(500).json({ error: 'Failed to fetch video information.' });
  }
});

// ✅ Download Video API
app.get('/downloadVideo', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  ensureSkyTubeFolder(); // ✅ Ensure folder exists

  const filePath = path.join(SKYTUBE_FOLDER, 'video.mp4');

  try {
    await runYtdlp(["-f", "bestaudio+bestvideo", "-o", filePath, url]);
    res.json({ success: true, message: 'Video downloaded successfully!', path: filePath });
  } catch (err) {
    console.error('Error downloading video:', err);
    res.status(500).json({ error: 'Failed to download video.' });
  }
});

// ✅ Download Audio API
app.get('/downloadAudio', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  ensureSkyTubeFolder(); // ✅ Ensure folder exists

  const filePath = path.join(SKYTUBE_FOLDER, 'audio.mp3');

  try {
    await runYtdlp(["-f", "bestaudio", "--extract-audio", "--audio-format", "mp3", "-o", filePath, url]);
    res.json({ success: true, message: 'Audio downloaded successfully in MP3 format!', path: filePath });
  } catch (err) {
    console.error('Error downloading audio:', err);
    res.status(500).json({ error: 'Failed to download audio.' });
  }
});

// ✅ Start Express Server
app.listen(port, () => {
  console.log(`Backend API is running at http://localhost:${port}`);
});
