import should from 'should';
import sinon from 'sinon';
import naclFactory from 'js-nacl';

process.env.NODE_ENV = 'test';

should.use((_, Assertion) => {
	Assertion.add('hexString', function hexString() {
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

naclFactory.instantiate((nacl) => {
	global.naclInstance = nacl;
});
