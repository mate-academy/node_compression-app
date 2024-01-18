# Compression App (with Node.js)
Implement a page with HTML `form` that allows to:
- select a file (add input field with name `file`)
- choose a compression type supported by zlib (add select field with name `compressionType` and options: `gzip`, `deflate`, `br`)
- add a button to submit the form
- send submitted form data to the server via POST request to `/compress` endpoint
- and receive a compressed file in response with the same name as the original file but with appended compression type extension (`.gz`, `.dfl`, `.br` respectively), example:
  - original file: `file.txt`
  - compression type: `gzip`
  - compressed file: `file.txt.gz`

To pass the task you also need to implement a server that:
- use Streams
- use `zlib` module
- write server code in `createServer.js` file (it is used to test your app)
- respond with 404 status code if trying access a non-existent endpoint
- respond with 400 status code if trying send a GET request to `/compress` endpoint
- respond with 400 status code if the form is invalid
- respond with 400 status code if trying to compress a file with an unsupported compression type
- respond with 200 status code and compressed file if the form is valid

**Read [the guideline](https://github.com/mate-academy/js_task-guideline/blob/master/README.md) before start**
