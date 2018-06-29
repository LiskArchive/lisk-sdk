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
import * as getInputsFromSources from '../../../src/utils/input';

describe('account:show', () => {
	const defaultKeys = {
		publicKey: 'somePublicKey',
		privateKey: 'somePrivateKey',
	};
	const defaultAddress = {
		address: 'someAddress',
	};
	const passphraseInput = {
		passphrase:
			'whale acoustic sword work scene frame assume ensure hawk federal upgrade angry',
	};

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
			getInputsFromSources,
			'default',
			sandbox.stub().resolves(passphraseInput),
		);

	setupStub
		.stdout()
		.command(['account:show'])
		.it('should show account with prompt', () => {
			expect(print.default).to.be.called;
			expect(getInputsFromSources.default).to.be.calledWithExactly({
				passphrase: {
					source: undefined,
					repeatPrompt: true,
				},
			});
			return expect(printMethodStub).to.be.calledWithExactly(
				Object.assign({}, defaultKeys, defaultAddress),
			);
		});

	setupStub
		.stdout()
		.command(['account:show', '--passphrase=pass:123'])
		.it('should show account with pass', () => {
			expect(print.default).to.be.called;
			expect(getInputsFromSources.default).to.be.calledWithExactly({
				passphrase: {
					source: 'pass:123',
					repeatPrompt: true,
				},
			});
			return expect(printMethodStub).to.be.calledWith(
				Object.assign({}, defaultKeys, defaultAddress),
			);
		});
});
