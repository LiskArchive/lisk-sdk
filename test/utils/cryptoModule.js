const lisk = require('lisk-js');
const cryptoModule = require('../../src/utils/cryptoModule');

describe('cryptoModule class', () => {

	it('should use lisk-js encryptMessageWithSecret', () => {
		sinon.stub(lisk.crypto, 'encryptMessageWithSecret');

		const message = 'Hello Lisker';
		const secret = 'pass phrase';
		const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
		cryptoModule.encrypt(message, secret, recipient);

		(lisk.crypto.encryptMessageWithSecret.calledWith(message, secret, recipient))
			.should.be.true();

		lisk.crypto.encryptMessageWithSecret.restore();
	});

});
