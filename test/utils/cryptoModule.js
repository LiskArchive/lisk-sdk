const lisk = require('lisk-js');
const cryptoModule = require('../../src/utils/cryptoModule');

describe('cryptoModule class', () => {
	let stub;
	const message = 'Hello Lisker';
	const secret = 'pass phrase';
	const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';

	beforeEach(() => {
		stub = sinon.stub(lisk.crypto, 'encryptMessageWithSecret');
	});

	afterEach(() => {
		lisk.crypto.encryptMessageWithSecret.restore();
	});

	it('should use lisk-js encryptMessageWithSecret', () => {
		cryptoModule.encrypt(message, secret, recipient);

		(lisk.crypto.encryptMessageWithSecret.calledWith(message, secret, recipient))
			.should.be.true();
	});

	it('should handle error responses', () => {
		const message = 'Cannot read property \'length\' of null';
		const error = new TypeError(message);
		stub.throws(error);

		const result = cryptoModule.encrypt(message, secret, recipient);

		(result).should.have.property('error', message);
	});

});
