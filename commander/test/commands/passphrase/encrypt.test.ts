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

describe('passphrase:encrypt', () => {
	const encryptedPassphraseString =
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1';
	const defaultKeys = {
		publicKey:
			'337600533a1f734c84b738d5f634c284a80ecc8b92bae4f30c1f22f8fd001e6a',
	};
	const encryptedPassphraseObject = {
		salt: 'salt',
		cipherText: 'cipherText',
		iv: 'iv',
		tag: 'tag',
		version: 1,
	};
	const defaultInputs = {
		passphrase:
			'enemy pill squeeze gold spoil aisle awake thumb congress false box wagon',
		password: 'LbYpLpV9Wpec6ux8',
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(cryptography, 'getKey', sandbox.stub().returns(defaultKeys))
			.stub(
				cryptography,
				'encryptPassphraseWithPassword',
				sandbox.stub().returns(encryptedPassphraseObject),
			)
			.stub(
				cryptography,
				'stringifyEncryptedPassphrase',
				sandbox.stub().returns(encryptedPassphraseString),
			)
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('passphrase:encrypt', () => {
		setupTest()
			.command(['passphrase:encrypt'])
			.it('should encrypt passphrase', () => {
				expect(
					cryptography.encryptPassphraseWithPassword,
				).to.be.calledWithExactly(
					defaultInputs.passphrase,
					defaultInputs.password,
				);
				expect(
					cryptography.stringifyEncryptedPassphrase,
				).to.be.calledWithExactly(encryptedPassphraseObject);
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					password: {
						source: undefined,
						repeatPrompt: true,
					},
				});
				return expect(printMethodStub).to.be.calledWithExactly({
					encryptedPassphrase: encryptedPassphraseString,
				});
			});
	});

	describe('passphrase:encrypt --outputPublicKey', () => {
		setupTest()
			.command(['passphrase:encrypt', '--outputPublicKey'])
			.it('should encrypt passphrase and output public key', () => {
				expect(
					cryptography.encryptPassphraseWithPassword,
				).to.be.calledWithExactly(
					defaultInputs.passphrase,
					defaultInputs.password,
				);
				expect(
					cryptography.stringifyEncryptedPassphrase,
				).to.be.calledWithExactly(encryptedPassphraseObject);
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					password: {
						source: undefined,
						repeatPrompt: true,
					},
				});
				return expect(printMethodStub).to.be.calledWithExactly({
					encryptedPassphrase: encryptedPassphraseString,
					...defaultKeys,
				});
			});
	});

	describe('passphrase:encrypt --passphrase=pass:"enemy pill squeeze gold spoil aisle awake thumb congress false box wagon"', () => {
		setupTest()
			.command([
				'passphrase:encrypt',
				'--passphrase=pass:"enemy pill squeeze gold spoil aisle awake thumb congress false box wagon"',
			])
			.it(
				'should encrypt passphrase from passphrase flag and stdout password',
				() => {
					expect(
						cryptography.encryptPassphraseWithPassword,
					).to.be.calledWithExactly(
						defaultInputs.passphrase,
						defaultInputs.password,
					);
					expect(
						cryptography.stringifyEncryptedPassphrase,
					).to.be.calledWithExactly(encryptedPassphraseObject);
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source:
								'pass:"enemy pill squeeze gold spoil aisle awake thumb congress false box wagon"',
							repeatPrompt: true,
						},
						password: {
							source: undefined,
							repeatPrompt: true,
						},
					});
					return expect(printMethodStub).to.be.calledWithExactly({
						encryptedPassphrase: encryptedPassphraseString,
					});
				},
			);
	});

	describe('passphrase:encrypt --passphrase=pass:"enemy pill squeeze gold spoil aisle awake thumb congress false box wagon" --password=pass:LbYpLpV9Wpec6ux8', () => {
		setupTest()
			.command([
				'passphrase:encrypt',
				'--passphrase=pass:"enemy pill squeeze gold spoil aisle awake thumb congress false box wagon"',
				'--password=pass:LbYpLpV9Wpec6ux8',
			])
			.it(
				'should encrypt passphrase from passphrase and password flags',
				() => {
					expect(
						cryptography.encryptPassphraseWithPassword,
					).to.be.calledWithExactly(
						defaultInputs.passphrase,
						defaultInputs.password,
					);
					expect(
						cryptography.stringifyEncryptedPassphrase,
					).to.be.calledWithExactly(encryptedPassphraseObject);
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source:
								'pass:"enemy pill squeeze gold spoil aisle awake thumb congress false box wagon"',
							repeatPrompt: true,
						},
						password: {
							source: 'pass:LbYpLpV9Wpec6ux8',
							repeatPrompt: true,
						},
					});
					return expect(printMethodStub).to.be.calledWithExactly({
						encryptedPassphrase: encryptedPassphraseString,
					});
				},
			);
	});
});
