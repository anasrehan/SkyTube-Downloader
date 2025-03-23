 const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors({
  origin: "*", // 🚀 Allow All Origins (For Testing)
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json())
const runYtdlp = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`);
      } else {
        resolve(JSON.parse(stdout));
      }
    });
  });
};

app.get('/videoDetails', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  try {
    const command = `yt-dlp -j ${url}`;
    const videoInfo = await runYtdlp(command);

    // Ensure formats exist
    const formats = videoInfo.formats?.filter(f => f.url) || [];
    
    // ✅ Sirf aik best video+audio format
    const bestVideo = formats.find(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.ext === 'mp4');

    // ✅ Sirf aik best audio-only format
    const bestAudio = formats.find(f => f.acodec !== 'none' && f.vcodec === 'none');

    res.json({
      title: videoInfo.title,
      thumbnail: videoInfo.thumbnail,
      duration: videoInfo.duration,
      formats: [bestVideo, bestAudio], // ✅ Sirf 2 formats bhejain
      bestVideo,
      bestAudio
    });
  } catch (err) {
    console.error('Error fetching video information:', err);
    res.status(500).json({ error: 'Failed to fetch video information.' });
  }
});




const SKYTUBE_FOLDER = path.join(__dirname, 'SkyTube'); // Mobile storage path ho sakta hai

// ✅ Function to check and create SkyTube folder
const ensureSkyTubeFolder = () => {
  if (!fs.existsSync(SKYTUBE_FOLDER)) {
    fs.mkdirSync(SKYTUBE_FOLDER, { recursive: true });
    console.log('SkyTube folder created.');
  }
};

// ✅ Download Video API (Saves in SkyTube folder)
app.get('/downloadVideo', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  ensureSkyTubeFolder(); // Ensure folder exists

  const filePath = path.join(SKYTUBE_FOLDER, 'video.mp4');
  const command = `yt-dlp -f "bestaudio+bestvideo" -o "${filePath}" ${url}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Error downloading video:', stderr);
      return res.status(500).json({ error: 'Failed to download video.' });
    }
    res.json({ success: true, message: 'Video downloaded successfully!', path: filePath });
  });
});

app.get('/downloadAudio', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  ensureSkyTubeFolder(); // Ensure folder exists

  const filePath = path.join(SKYTUBE_FOLDER, 'audio.mp3');
  const command = `yt-dlp -f "bestaudio" --extract-audio --audio-format mp3 -o "${filePath}" ${url}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Error downloading audio:', stderr);
      return res.status(500).json({ error: 'Failed to download audio.' });
    }
    res.json({ success: true, message: 'Audio downloaded successfully in MP3 format!', path: filePath });
  });

});



app.listen(port, () => {
  console.log(`Backend API is running at http://localhost:${port}`);
});
