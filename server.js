const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.post('/upload', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
  const { title } = req.body;
  const video = req.files.video[0];
  const thumbnail = req.files.thumbnail[0];

  const videoData = {
    title,
    videoUrl: `/uploads/${video.filename}`,
    thumbnailUrl: `/uploads/${thumbnail.filename}`
  };

  const filePath = './uploads/data.json';
  let data = [];

  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath));
  }

  data.push(videoData);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  res.json({ success: true, video: videoData });
});

app.get('/videos', (req, res) => {
  const filePath = './uploads/data.json';
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath));
    res.json(data);
  } else {
    res.json([]);
  }
});

app.listen(3000, () => console.log('Server jalan di http://localhost:3000'));
