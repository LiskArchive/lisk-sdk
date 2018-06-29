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
import { expect, test } from '../../test';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';
import cryptography from '../../../src/utils/cryptography';
import * as mnemonic from '../../../src/utils/mnemonic';

describe('account:create', () => {
	const defaultKeys = {
		publicKey: 'somePublicKey',
		privateKey: 'somePrivateKey',
	};
	const defaultAddress = {
		address: 'someAddress',
	};
	const defaultMnemonic =
		'whale acoustic sword work scene frame assume ensure hawk federal upgrade angry';

	const printMethodStub = sandbox.stub();
	const setupStub = test
		.stub(print, 'default', sandbox.stub().returns(printMethodStub))
		.stub(config, 'getConfig', sandbox.stub().returns({}))
		.stub(cryptography, 'getKeys', sandbox.stub().returns(defaultKeys))
		.stub(
			cryptography,
			'getAddressFromPublicKey',
			sandbox.stub().returns(defaultAddress),
		)
		.stub(
			mnemonic,
			'createMnemonicPassphrase',
			sandbox.stub().returns(defaultMnemonic),
		);

	setupStub
		.stdout()
		.command(['account:create'])
		.it('should create account', () => {
			expect(print.default).to.be.called;
			expect(cryptography.getKeys).to.be.calledWithExactly(defaultMnemonic);
			expect(cryptography.getAddressFromPublicKey).to.be.calledWithExactly(
				defaultKeys.publicKey,
			);
			return expect(printMethodStub).to.be.calledWith(
				Object.assign({}, defaultKeys, defaultAddress, {
					passphrase: defaultMnemonic,
				}),
			);
		});
});
