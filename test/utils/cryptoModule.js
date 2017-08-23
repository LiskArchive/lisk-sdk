/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
const lisk = require('lisk-js');
const cryptoModule = require('../../src/utils/cryptoModule');

describe('cryptoModule class', () => {
	const message = 'Hello Lisker';
	const secret = 'pass phrase';
	const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';

	let encryptMessageWithSecretStub;

	beforeEach(() => {
		encryptMessageWithSecretStub = sinon.stub(lisk.crypto, 'encryptMessageWithSecret');
	});

	afterEach(() => {
		encryptMessageWithSecretStub.restore();
	});

	it('should use lisk-js encryptMessageWithSecret', () => {
		cryptoModule.encrypt(message, secret, recipient);

		(encryptMessageWithSecretStub.calledWithExactly(message, secret, recipient))
			.should.be.true();
	});

	it('should handle error responses', () => {
		const errorMessage = 'Cannot read property \'length\' of null';
		const error = new TypeError(errorMessage);
		encryptMessageWithSecretStub.throws(error);

		const result = cryptoModule.encrypt(errorMessage, secret, recipient);

		(result).should.have.property('error', errorMessage);
	});
});
