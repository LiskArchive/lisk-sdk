/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { expect, test } from '@oclif/test';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';
import * as readerUtils from '../../../src/utils/reader';

describe('account:show', () => {
	const defaultKeys = {
		publicKey: 'somePublicKey',
		privateKey: 'somePrivateKey',
	};
	const defaultAddress = 'someAddress';
	const passphraseInput =
		'whale acoustic sword work scene frame assume ensure hawk federal upgrade angry';

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(cryptography, 'getKeys', sandbox.stub().returns(defaultKeys))
			.stub(
				cryptography,
				'getAddressFromPublicKey',
				sandbox.stub().returns(defaultAddress),
			)
			.stub(
				readerUtils,
				'getPassphraseFromPrompt',
				sandbox.stub().resolves(passphraseInput),
			);

	describe('account:show', () => {
		setupTest()
			.stdout()
			.command(['account:show'])
			.it('should show account with prompt', () => {
				expect(printUtils.print).to.be.called;
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				return expect(printMethodStub).to.be.calledWithExactly({
					...defaultKeys,
					address: defaultAddress,
				});
			});

		setupTest()
			.stdout()
			.command(['account:show', '--passphrase=123'])
			.it('should show account with pass', () => {
				expect(printUtils.print).to.be.called;
				expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
				return expect(printMethodStub).to.be.calledWith({
					...defaultKeys,
					address: defaultAddress,
				});
			});
	});
});
