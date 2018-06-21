/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import crypto from '../../src/utils/cryptography';
// Required for stubbing
const elements = require('lisk-elements');

describe('crypto utils', () => {
	describe('#encryptMessage', () => {
		let result;
		let cryptoStub;
		beforeEach(() => {
			result = {
				result: 'result',
			};
			cryptoStub = sandbox
				.stub(elements.default.cryptography, 'encryptMessageWithPassphrase')
				.returns(result);
			return Promise.resolve(true);
		});

		it('should call encryptMessageWithPassphrase', () => {
			const expected = {
				message: 'msg',
				passphrase: 'random-passphrase',
				recipient: 'recipient',
			};
			const encryptedMessage = crypto.encryptMessage(expected);
			expect(encryptedMessage).to.equal(result);
			return expect(cryptoStub).to.be.calledWithExactly(
				expected.message,
				expected.passphrase,
				expected.recipient,
			);
		});
	});
});
