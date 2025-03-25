const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const SKYTUBE_FOLDER = path.join(__dirname, 'SkyTube');

// ✅ Function to check and create SkyTube folder
const ensureSkyTubeFolder = () => {
  if (!fs.existsSync(SKYTUBE_FOLDER)) {
    fs.mkdirSync(SKYTUBE_FOLDER, { recursive: true });
    console.log('SkyTube folder created.');
  }
};

// ✅ Run yt-dlp command
const runYtdlp = (args) => {
  return new Promise((resolve, reject) => {
    const command = `/home/anas-rehan/.local/bin/yt-dlp ${args.join(" ")}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`);
      } else {
        resolve(stdout);
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
    const output = await runYtdlp(["-j", url]);
    const videoInfo = JSON.parse(output);

    const bestVideo = videoInfo.formats.find(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.ext === 'mp4');
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

  ensureSkyTubeFolder();
  const filePath = path.join(SKYTUBE_FOLDER, 'video.mp4');

  try {
    await runYtdlp(["-f", "bestaudio+bestvideo", "-o", `"${filePath}"`, url]);
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

  ensureSkyTubeFolder();
  const filePath = path.join(SKYTUBE_FOLDER, 'audio.mp3');

  try {
    await runYtdlp(["-f", "bestaudio", "--extract-audio", "--audio-format", "mp3", "-o", `"${filePath}"`, url]);
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
