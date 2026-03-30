const https = require('https');
const fs = require('fs');
const path = require('path');

const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');

if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

const sounds = [
  { name: 'alert1.mp3', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_783cd3a30c.mp3' },
  { name: 'alert2.mp3', url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_062141506b.mp3' },
  { name: 'classic.mp3', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c030383182.mp3' },
  { name: 'modern.mp3', url: 'https://cdn.pixabay.com/audio/2024/02/08/audio_82c612347d.mp3' },
];

sounds.forEach(sound => {
  const filePath = path.join(soundsDir, sound.name);
  const file = fs.createWriteStream(filePath);

  https.get(sound.url, response => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${sound.name}`);
    });
  }).on('error', err => {
    fs.unlink(filePath);
    console.error(`Error downloading ${sound.name}: ${err.message}`);
  });
});
