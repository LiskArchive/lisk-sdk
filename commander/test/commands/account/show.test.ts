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
import * as sandbox from 'sinon';
import { expect, test } from '@oclif/test';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';
import * as readerUtils from '../../../src/utils/reader';

describe('account:show', () => {
	const passphraseInput =
		'whale acoustic sword work scene frame assume ensure hawk federal upgrade angry';
	const secondDefaultMnemonic =
		'alone cabin buffalo blast region upper jealous basket brush put answer twice';

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
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
				return expect(printMethodStub).to.be.calledWith({
					privateKey: cryptography
						.getKeys(passphraseInput)
						.privateKey.toString('base64'),
					publicKey: cryptography
						.getKeys(passphraseInput)
						.publicKey.toString('base64'),
					address: cryptography.getBase32AddressFromPublicKey(
						cryptography.getKeys(passphraseInput).publicKey.toString('hex'),
						'lsk',
					),
					binaryAddress: cryptography
						.getAddressFromPassphrase(passphraseInput)
						.toString('base64'),
				});
			});

		setupTest()
			.stdout()
			.command(['account:show', `--passphrase=${secondDefaultMnemonic}`])
			.it('should show account with pass', () => {
				expect(printUtils.print).to.be.called;
				expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
				return expect(printMethodStub).to.be.calledWith({
					privateKey: cryptography
						.getKeys(secondDefaultMnemonic)
						.privateKey.toString('base64'),
					publicKey: cryptography
						.getKeys(secondDefaultMnemonic)
						.publicKey.toString('base64'),
					address: cryptography.getBase32AddressFromPublicKey(
						cryptography
							.getKeys(secondDefaultMnemonic)
							.publicKey.toString('hex'),
						'lsk',
					),
					binaryAddress: cryptography
						.getAddressFromPassphrase(secondDefaultMnemonic)
						.toString('base64'),
				});
			});
	});
});
