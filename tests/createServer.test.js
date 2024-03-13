/* eslint-disable max-len */
'use strict';

const { Server, Agent } = require('http');
const axios = require('axios');
// eslint-disable-next-line no-shadow
const FormData = require('form-data');
const { Readable } = require('stream');
const { faker } = require('@faker-js/faker');
const zlib = require('zlib');
const util = require('util');
const { createServer } = require('../src/createServer');

// this prevents `socket hang up` for Node.js 20.10+
axios.defaults.httpAgent = new Agent({ keepAlive: false });

const PORT = 5701;
const HOST = `http://localhost:${PORT}`;

function stringToStream(str) {
  const stream = new Readable();

  stream.push(str);
  stream.push(null);

  return stream;
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
  describe('basic scenarios', () => {
    it('should create a server', () => {
      expect(createServer).toBeInstanceOf(Function);
    });

    it('should create an instance of Server', () => {
      expect(createServer()).toBeInstanceOf(Server);
    });
  });

  describe('Server', () => {
    let server;

    beforeEach(() => {
      server = createServer();

      server.listen(PORT);
    });

    afterEach(() => {
      server.close();
    });

    it('should respond with 200 status code if trying to GET "/"', () => {
      expect.assertions(1);

      return axios.get(HOST).then((res) => expect(res.status).toBe(200));
    });

    it('should respond with 404 status code if trying to access a non-existing route', () => {
      expect.assertions(1);

      return axios
        .get(`${HOST}/${faker.string.uuid()}`)
        .catch((err) => expect(err.response.status).toBe(404));
    });

    it('should respond with 400 status code if trying send a GET request to "/compress" endpoint', () => {
      expect.assertions(1);

      return axios
        .get(`${HOST}/compress`)
        .catch((err) => expect(err.response.status).toBe(400));
    });

    describe('POST to the "/compress" endpoint', () => {
      let formData;
      let filename;
      let content;

      beforeEach(() => {
        formData = new FormData();
        filename = faker.system.fileName();
        content = faker.lorem.paragraphs();
      });

      Object.entries(compressionTypes).forEach(
        ([compressionType, { decompress }]) => {
          describe(`compression type "${compressionType}"`, () => {
            it('should respond with 200 status code', () => {
              expect.assertions(1);

              formData.append('file', stringToStream(content), { filename });

              formData.append('compressionType', compressionType);

              return axios
                .post(`${HOST}/compress`, formData, {
                  headers: formData.getHeaders(),
                })
                .then((res) => expect(res.status).toBe(200));
            });

            it('should respond with a correct "Content-Disposition" header', () => {
              expect.assertions(1);

              formData.append('file', stringToStream(content), { filename });

              formData.append('compressionType', compressionType);

              return axios
                .post(`${HOST}/compress`, formData, {
                  headers: formData.getHeaders(),
                })
                .then((res) => {
                  const expectedHeader = `attachment; filename=${filename}.${compressionType}`;

                  expect(res.headers['content-disposition']).toBe(
                    expectedHeader,
                  );
                });
            });

            it(`should respond with a file compressed with "${compressionType}" algorithm`, () => {
              expect.assertions(1);

              formData.append('file', stringToStream(content), { filename });

              formData.append('compressionType', compressionType);

              return axios
                .post(`${HOST}/compress`, formData, {
                  headers: formData.getHeaders(),
                  responseType: 'arraybuffer',
                })
                .then((res) => decompress(res.data))
                .then((uncompressedData) => {
                  expect(uncompressedData.toString()).toBe(content);
                });
            });
          });
        },
      );

      describe('ivalid form data scenarios', () => {
        it('should respond with 400 status code if no file is provided', () => {
          expect.assertions(1);

          formData.append(
            'compressionType',
            faker.helpers.arrayElement(Object.keys(compressionTypes)),
          );

          return axios
            .post(`${HOST}/compress`, formData, {
              headers: formData.getHeaders(),
            })
            .catch((err) => expect(err.response.status).toBe(400));
        });

        it('should respond with 400 status code if no compression type is provided', () => {
          expect.assertions(1);

          formData.append('file', stringToStream(content), { filename });

          return axios
            .post(`${HOST}/compress`, formData, {
              headers: formData.getHeaders(),
            })
            .catch((err) => expect(err.response.status).toBe(400));
        });

        it('should respond with 400 status code if an unsupported compression type is provided', () => {
          expect.assertions(1);

          formData.append('file', stringToStream(content), { filename });

          formData.append('compressionType', faker.string.uuid());

          return axios
            .post(`${HOST}/compress`, formData, {
              headers: formData.getHeaders(),
            })
            .then(() => expect(true).toBe(true))
            .catch((err) => expect(err.response.status).toBe(400));
        });
      });
    });
  });
});
