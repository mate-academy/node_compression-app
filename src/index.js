'use strict';
import http from 'http';
import fs from 'fs';
import zlib from 'zlib';
import formidable from 'formidable';

const server = new http.Server();

server.on('request', async (req, res) => {
  if (req.method.toLowerCase() === 'post') {
    const form = formidable({});
    res.statusCode = 200;
    const gzip = zlib.createGzip();
    const br = zlib.createBrotliCompress();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 500;
        res.end(err.message);
        return;
      }

      const file = files.file.filepath;
      const encoding = fields.compressionType;
      console.log(file)

      res.setHeader('Content-Encoding', encoding);

      const fileStream = fs.createReadStream(file);

      // fileStream.pipe(encoding === 'br' ? br : gzip).pipe(res);

      fileStream.on('error', (err) => {
        res.statusCode = 500;
        res.end(err.message);
      })
      .pipe(encoding === 'br' ? br : gzip)
      .on('error', () => console.log(err))
      .pipe(res)
      .on('error', () => console.log(err))

      fileStream.on('close', fileStream.destroy());

      res.on('finish', () => {
        res.end();
      });
    });
  }

  // req.on('end', () => {
  //   let data;
  //   let rawData;
  //   try {
  //     // const data = JSON.parse(Buffer.concat(chunks).toString());
  //     rawData = Buffer.concat(chunks).toString();
  //     data = JSON.parse(rawData);
  //     const file = data.file;
  //     const encoding = data.compressionType;
  //     const fileStream = fs.createReadStream(file);

  //     res.setHeader('Content-Encoding', encoding);

  //     fileStream.pipe(encoding === 'br' ? br : gzip).pipe(res);

  //     fileStream.on('error', (err) => {
  //       res.statusCode = 500;
  //       res.end(err.message);
  //     });
  //   } catch (err) {
  //     res.statusCode = 400;
  //     console.log(data);
  //     console.log(rawData);
  //     res.end( err.message);
  //   }
  // })
})

server.on('error', (err) => console.log(err.message));

server.listen(3000, () => {
  console.log('server run');
});
