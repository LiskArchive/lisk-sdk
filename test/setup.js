var should = require('should');
var sinon = require('sinon');
var naclFactory = require('js-nacl');

process.env.NODE_ENV = 'test';

should.use(function (should, Assertion) {
	Assertion.add('hexString', function () {
		this.params = {
			operator: 'to be hex string',
		};
		(Buffer.from(this.obj, 'hex').toString('hex'))
			.should.equal(this.obj);
	});
});

// See https://github.com/shouldjs/should.js/issues/41
Object.defineProperty(global, 'should', { value: should });
global.sinon = sinon;

naclFactory.instantiate(function (nacl) {
	global.naclInstance = nacl;
});
