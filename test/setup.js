const should = require('should');
const sinon = require('sinon');

process.env.NODE_ENV = 'test';

// See https://github.com/shouldjs/should.js/issues/41
Object.defineProperty(global, 'should', { value: should });
global.sinon = sinon;
