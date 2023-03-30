import express from 'express';
import multer from 'multer';
import zlib from 'zlib';
import fs from 'fs';
import stream  from 'stream';

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get('/', (req, res) => {
  res.end(fs.readFileSync('public/index.html'));
});

app.post('/upload', upload.single('file'), (req, res) => {
  const filename = req.file.originalname;
  const input = new stream.PassThrough();
  input.end(req.file.buffer);
  const output = fs.createWriteStream(`./compressed/${filename}.gzip`);
  const compress = zlib.createGzip();

  input.pipe(compress).pipe(output);
  output.on('finish', () => {
    res.send('File uploaded and compressed successfully!');
  });
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
