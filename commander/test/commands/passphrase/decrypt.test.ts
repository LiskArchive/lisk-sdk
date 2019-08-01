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
import * as inputUtils from '../../../src/utils/input';

describe('passphrase:decrypt', () => {
	const defaultEncryptedPassphrase =
		'salt=d3887df959ed2bfe5961a6831da6e177&cipherText=1c08a1&iv=096ede534df9092fd4523ec7&tag=2a055e1c860b3ef76084a6c9aca68ce9&version=1';
	const passphrase =
		'enemy pill squeeze gold spoil aisle awake thumb congress false box wagon';
	const encryptedPassphraseObject = {
		salt: 'salt',
		cipherText: 'cipherText',
		iv: 'iv',
		tag: 'tag',
		version: 1,
	};
	const defaultInputs = {
		password: 'LbYpLpV9Wpec6ux8',
		data: `${defaultEncryptedPassphrase}\nshould not be used`,
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(
				cryptography,
				'parseEncryptedPassphrase',
				sandbox.stub().returns(encryptedPassphraseObject),
			)
			.stub(
				cryptography,
				'decryptPassphraseWithPassword',
				sandbox.stub().returns(passphrase),
			)
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('passphrase:decrypt', () => {
		setupTest()
			.command(['passphrase:decrypt'])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'No encrypted passphrase was provided.',
				);
			})
			.it('should throw an error');
	});

	describe('passphrase:decrypt encryptedPassphrase', () => {
		setupTest()
			.command(['passphrase:decrypt', defaultEncryptedPassphrase])
			.it('should decrypt passphrase with arg', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					password: {
						source: undefined,
					},
					data: undefined,
				});
				expect(cryptography.parseEncryptedPassphrase).to.be.calledWithExactly(
					defaultEncryptedPassphrase,
				);
				expect(
					cryptography.decryptPassphraseWithPassword,
				).to.be.calledWithExactly(
					encryptedPassphraseObject,
					defaultInputs.password,
				);
				return expect(printMethodStub).to.be.calledWithExactly({ passphrase });
			});
	});

	describe('passphrase:decrypt --passphrase=file:./path/to/encrypted_passphrase.txt', () => {
		const passphraseSource = 'file:./path/to/encrypted_passphrase.txt';
		setupTest()
			.command(['passphrase:decrypt', `--passphrase=${passphraseSource}`])
			.it('should decrypt passphrase with passphrase flag', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					password: {
						source: undefined,
					},
					data: {
						source: passphraseSource,
					},
				});
				expect(cryptography.parseEncryptedPassphrase).to.be.calledWithExactly(
					defaultEncryptedPassphrase,
				);
				expect(
					cryptography.decryptPassphraseWithPassword,
				).to.be.calledWithExactly(
					encryptedPassphraseObject,
					defaultInputs.password,
				);
				return expect(printMethodStub).to.be.calledWithExactly({ passphrase });
			});
	});

	describe('passphrase:decrypt --passphrase=filePath --password=pass:LbYpLpV9Wpec6ux8', () => {
		const passphraseSource = 'file:./path/to/encrypted_passphrase.txt';
		setupTest()
			.command([
				'passphrase:decrypt',
				`--passphrase=${passphraseSource}`,
				'--password=pass:LbYpLpV9Wpec6ux8',
			])
			.it(
				'should decrypt passphrase with passphrase flag and password flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						password: {
							source: 'pass:LbYpLpV9Wpec6ux8',
						},
						data: {
							source: passphraseSource,
						},
					});
					expect(cryptography.parseEncryptedPassphrase).to.be.calledWithExactly(
						defaultEncryptedPassphrase,
					);
					expect(
						cryptography.decryptPassphraseWithPassword,
					).to.be.calledWithExactly(
						encryptedPassphraseObject,
						defaultInputs.password,
					);
					return expect(printMethodStub).to.be.calledWithExactly({
						passphrase,
					});
				},
			);
	});
});
