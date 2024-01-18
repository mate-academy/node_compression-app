/* eslint-disable max-len */
'use strict';

const { Server } = require('http');
const axios = require('axios');
const FormData = require('form-data');
const { promises: fs, createReadStream } = require('fs');
const path = require('path');
const faker = require('faker');
const zlib = require('zlib');
const util = require('util');

const PORT = 5701;
const HOST = `http://localhost:${PORT}`;
const COMPRESS_ENDPOINT = `${HOST}/compress`;

class MockedFile {
  constructor() {
    this.filename = faker.system.fileName();
    this.content = faker.lorem.paragraphs();
  }

  async create() {
    this.mockFilePath = path.resolve(__dirname, this.filename);

    await fs.writeFile(this.mockFilePath, this.content);
  }

  async read() {
    return fs.readFile(this.mockFilePath);
  }

  async remove() {
    await fs.unlink(this.mockFilePath);
  }
}

const compressionTypes = {
  gzip: {
    decompress: util.promisify(zlib.gunzip),
  },
  deflate: {
    decompress: util.promisify(zlib.inflate),
  },
  br: {
    decompress: util.promisify(zlib.brotliDecompress),
  },
};

describe('createServer', () => {
  let createServer;

  beforeAll(() => {
    createServer = require('../src/createServer').createServer;
  });

  describe('basic scenarios', () => {
    it('should create a server', () => {
      expect(createServer)
        .toBeInstanceOf(Function);
    });

    it('should create an instance of Server', () => {
      expect(createServer())
        .toBeInstanceOf(Server);
    });
  });

  describe('Server', () => {
    let server;

    function listen(port) {
      return new Promise((resolve) => {
        server.listen(port, () => {
          resolve();
        });
      });
    }

    beforeAll(async() => {
      server = createServer();

      await listen(PORT);
    });

    afterAll(() => {
      server.close();
    });

    it('should respond with 404 status code if trying to access a non-existing route', async() => {
      let response;

      try {
        response = await axios.post(`${HOST}/non-existing`);
      } catch (err) {
        expect(err.response.status)
          .toBe(404);
      }

      expect(response).toBeUndefined();
    });

    it('should respond with 400 status code if trying send a GET request to "/compress" endpoint', async() => {
      let response;

      try {
        response = await axios.get(COMPRESS_ENDPOINT);
      } catch (err) {
        expect(err.response.status)
          .toBe(400);
      }

      expect(response).toBeUndefined();
    });

    describe('GET the "/" endpoint', () => {
      let response;
      let body;

      beforeAll(async() => {
        response = await axios.get(`${HOST}`);
        body = response.data;
      });

      it('should return a 200 status code', async() => {
        expect(response.status).toBe(200);
      });

      it('should return a page with an HTML form', async() => {
        expect(body).toContain('<form');
      });

      it('should return a page with a file input field named "file"', async() => {
        expect(body).toMatch(/<input[^>]+name="file"/);
      });

      it('should return a page with a compression select field named "compressionType"', async() => {
        expect(body).toMatch(/<select[^>]+name="compressionType"/);
      });

      it(`should return a a page with the list of compression options with values ${Object.keys(compressionTypes).join(', ')}`, async() => {
        const expectedOptions = Object.keys(compressionTypes);

        expectedOptions.forEach(option => {
          const optionRegex = new RegExp(`<option[^>]+value="${option}"`);

          expect(body).toMatch(optionRegex);
        });
      });

      it('should return a page with a submit button', async() => {
        expect(body).toMatch(/<button[^>]+type="submit"/);
      });
    });

    describe('POST to the "/compress" endpoint', () => {
      let formData;
      let mockedFile;

      beforeEach(async() => {
        formData = new FormData();
        mockedFile = new MockedFile();

        await mockedFile.create();
      });

      afterEach(async() => {
        await mockedFile.remove();
      });

      it('should respond with 400 status code if no file is provided', async() => {
        let response;

        formData.append('compressionType', 'gzip');

        try {
          response = await axios.post(COMPRESS_ENDPOINT, formData, {
            headers: formData.getHeaders(),
          });
        } catch (err) {
          expect(err.response.status)
            .toBe(400);
        }

        expect(response).toBeUndefined();
      });

      it('should respond with 400 status code if no compression type is provided', async() => {
        let response;

        const {
          mockFilePath,
          filename,
        } = mockedFile;

        formData.append(
          'file',
          createReadStream(mockFilePath),
          { filename },
        );

        try {
          response = await axios.post(COMPRESS_ENDPOINT, formData, {
            headers: formData.getHeaders(),
          });
        } catch (err) {
          expect(err.response.status)
            .toBe(400);
        }

        expect(response).toBeUndefined();
      });

      it('should respond with 400 status code if an unsupported compression type is provided', async() => {
        let response;

        const {
          mockFilePath,
          filename,
        } = mockedFile;

        formData.append(
          'file',
          createReadStream(mockFilePath),
          { filename },
        );

        formData.append('compressionType', 'unsupported');

        try {
          response = await axios.post(COMPRESS_ENDPOINT, formData, {
            headers: formData.getHeaders(),
          });
        } catch (err) {
          expect(err.response.status)
            .toBe(400);
        }

        expect(response).toBeUndefined();
      });

      Object.entries(compressionTypes).forEach(([compressionType, { decompress }]) => {
        describe(`compression type "${compressionType}"`, () => {
          it('should respond with 200 status code', async() => {
            const {
              mockFilePath,
              filename,
            } = mockedFile;

            formData.append(
              'file',
              createReadStream(mockFilePath),
              { filename },
            );

            formData.append('compressionType', compressionType);

            const response = await axios.post(COMPRESS_ENDPOINT, formData, {
              headers: formData.getHeaders(),
            });

            expect(response.status)
              .toBe(200);
          });

          it('should respond with a correct "Content-Disposition" header', async() => {
            const {
              mockFilePath,
              filename,
            } = mockedFile;

            formData.append(
              'file',
              createReadStream(mockFilePath),
              { filename },
            );

            formData.append('compressionType', compressionType);

            const response = await axios.post(COMPRESS_ENDPOINT, formData, {
              headers: formData.getHeaders(),
            });

            const expectedHeader = `attachment; filename=${filename}.${compressionType}`;

            expect(response.headers['content-disposition'])
              .toBe(expectedHeader);
          });

          it(`should respond with a file compressed with "${compressionType}" algorithm`, async() => {
            const {
              mockFilePath,
              filename,
            } = mockedFile;

            formData.append(
              'file',
              createReadStream(mockFilePath),
              { filename },
            );

            formData.append('compressionType', compressionType);

            const response = await axios.post(COMPRESS_ENDPOINT, formData, {
              headers: formData.getHeaders(),
              responseType: 'arraybuffer',
            });

            const compressedFileData = response.data;
            const uncompressedData = await decompress(compressedFileData);
            const originalFileData = await mockedFile.read();

            expect(uncompressedData).toEqual(originalFileData);
          });
        });
      });
    });
  });
});
