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
import * as mnemonic from '../../../src/utils/mnemonic';

describe('account:create', () => {
	const defaultMnemonic =
		'lab mirror fetch tuna village sell sphere truly excite manual planet capable';
	const secondDefaultMnemonic =
		'alone cabin buffalo blast region upper jealous basket brush put answer twice';
	const defaultKeys = {
		publicKey:
			'88b182d9f2d8a7c3b481a8962ae7d445b7a118fbb6a6f3afcedf4e0e8c46ecac',
		privateKey:
			'1a8ea0ceed1b85c9cff5eb12ae8d9ccdac93b5d5c668775e12b86dd63a8cefa688b182d9f2d8a7c3b481a8962ae7d445b7a118fbb6a6f3afcedf4e0e8c46ecac',
	};
	const secondDefaultKeys = {
		publicKey:
			'90215077294ac1c727b357978df9291b77a8a700e6e42545dc0e6e5ba9582f13',
		privateKey:
			'bec5ac9d074d1684f9dd184fc44c4b37fb73ca9d013b6ddf5a92578a98f8848990215077294ac1c727b357978df9291b77a8a700e6e42545dc0e6e5ba9582f13',
	};
	const defaultAddress = '14389576228799148035L';
	const secondDefaultAddress = '10498496668550693658L';

	const printMethodStub = sandbox.stub();
	const setupTest = () => {
		const getKeysStub = sandbox.stub();
		getKeysStub.withArgs(defaultMnemonic).returns(defaultKeys);
		getKeysStub.withArgs(secondDefaultMnemonic).returns(secondDefaultKeys);

		const getAddressFromPublicKeyStub = sandbox.stub();
		getAddressFromPublicKeyStub
			.withArgs(defaultKeys.publicKey)
			.returns(defaultAddress);
		getAddressFromPublicKeyStub
			.withArgs(secondDefaultKeys.publicKey)
			.returns(secondDefaultAddress);

		return test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(
				mnemonic,
				'createMnemonicPassphrase',
				sandbox
					.stub()
					.onFirstCall()
					.returns(defaultMnemonic)
					.onSecondCall()
					.returns(secondDefaultMnemonic),
			)
			.stub(cryptography, 'getKeys', getKeysStub)
			.stub(
				cryptography,
				'getAddressFromPublicKey',
				getAddressFromPublicKeyStub,
			)
			.stdout();
	};

	describe('account:create', () => {
		setupTest()
			.command(['account:create'])
			.it('should create account', () => {
				expect(printUtils.print).to.be.called;
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

	describe('account:create --number=x', () => {
		const defaultNumber = 2;
		setupTest()
			.command(['account:create', `--number=${defaultNumber}`])
			.it('should create account', () => {
				expect(printUtils.print).to.be.calledOnce;
				expect(cryptography.getKeys).to.be.calledWithExactly(defaultMnemonic);
				expect(cryptography.getAddressFromPublicKey).to.be.calledWithExactly(
					defaultKeys.publicKey,
				);
				const result = [
					{
						...defaultKeys,
						address: defaultAddress,
						passphrase: defaultMnemonic,
					},
					{
						...secondDefaultKeys,
						address: secondDefaultAddress,
						passphrase: secondDefaultMnemonic,
					},
				];
				return expect(printMethodStub).to.be.calledWith(result);
			});

		setupTest()
			.command(['account:create', '--number=NaN'])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Number flag must be an integer and greater than 0',
				);
			})
			.it('should throw an error if the flag is invalid number');

		setupTest()
			.command(['account:create', '--number=0'])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Number flag must be an integer and greater than 0',
				);
			})
			.it('should throw an error if the number flag is less than 1');

		setupTest()
			.command(['account:create', '--number=10sk24'])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Number flag must be an integer and greater than 0',
				);
			})
			.it(
				'should throw an error if the number flag contains non-number characters',
			);
	});
});
