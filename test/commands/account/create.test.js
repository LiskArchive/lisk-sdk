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
import { expect, test } from '@oclif/test';
import { cryptography } from 'lisk-elements';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';
import * as mnemonic from '../../../src/utils/mnemonic';

describe('account:create', () => {
	const defaultKeys = {
		publicKey: 'somePublicKey',
		privateKey: 'somePrivateKey',
	};
	const defaultAddress = 'someAddress';
	const defaultMnemonic =
		'whale acoustic sword work scene frame assume ensure hawk federal upgrade angry';

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
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
			)
			.stdout();

	describe('account:create', () => {
		setupTest()
			.command(['account:create'])
			.it('should create account', () => {
				expect(print.default).to.be.called;
				expect(cryptography.getKeys).to.be.calledWithExactly(defaultMnemonic);
				expect(cryptography.getAddressFromPublicKey).to.be.calledWithExactly(
					defaultKeys.publicKey,
				);
				return expect(printMethodStub).to.be.calledWith([
					{
						...defaultKeys,
						address: defaultAddress,
						passphrase: defaultMnemonic,
					},
				]);
			});
	});

	describe('account:create --number x', () => {
		const defaultNumber = 3;
		setupTest()
			.command(['account:create', `--number=${defaultNumber}`])
			.it('should create account', () => {
				expect(print.default).to.be.calledOnce;
				expect(cryptography.getKeys).to.be.calledWithExactly(defaultMnemonic);
				expect(cryptography.getAddressFromPublicKey).to.be.calledWithExactly(
					defaultKeys.publicKey,
				);
				const result = Array(defaultNumber)
					.fill()
					.map(() => ({
						...defaultKeys,
						address: defaultAddress,
						passphrase: defaultMnemonic,
					}));
				return expect(printMethodStub).to.be.calledWith(result);
			});

		setupTest()
			.command(['account:create', '--number=NaN'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Number flag must be an integer and greater than 0',
				);
			})
			.it('should throw an error if the flag is invalid number');

		setupTest()
			.command(['account:create', '--number=0'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Number flag must be an integer and greater than 0',
				);
			})
			.it('should throw an error if the number flag is less than 1');
	});
});
