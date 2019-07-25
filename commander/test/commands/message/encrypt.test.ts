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

describe('message:encrypt', () => {
	const message = 'Hello World';
	const defaultRecipientPublicKey =
		'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
	const defaultEncryptedMessage = {
		nonce: '0ec64b2146336a62c9938475308411f00688f9d12c5d33a0',
		message: 'c9d369291997bf34abe505d48ac394175b68fc90f8f1d16fd1351e',
	};

	const defaultInputs = {
		passphrase:
			'card earn shift valley learn scorpion cage select help title control satoshi',
		data: 'message',
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(
				cryptography,
				'encryptMessageWithPassphrase',
				sandbox.stub().returns(defaultEncryptedMessage),
			)
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('message:encrypt', () => {
		setupTest()
			.command(['message:encrypt'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error');
	});

	describe('message:encrypt recipientPublicKey', () => {
		setupTest()
			.command(['message:encrypt', defaultRecipientPublicKey])
			.catch((error: Error) => {
				return expect(error.message).to.contain('No message was provided.');
			})
			.it('should throw an error');
	});

	describe('message:encrypt recipientPublicKey message', () => {
		setupTest()
			.command(['message:encrypt', defaultRecipientPublicKey, message])
			.it('should encrypt the message with the arg', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					data: undefined,
				});
				expect(
					cryptography.encryptMessageWithPassphrase,
				).to.be.calledWithExactly(
					message,
					defaultInputs.passphrase,
					defaultRecipientPublicKey,
				);
				return expect(printMethodStub).to.be.calledWithExactly({
					...defaultEncryptedMessage,
					recipientPublicKey: defaultRecipientPublicKey,
				});
			});
	});

	describe('message:encrypt recipientPublicKey --message=file:./message.txt', () => {
		setupTest()
			.command([
				'message:encrypt',
				defaultRecipientPublicKey,
				'--message=file:./message.txt',
			])
			.it(
				'should encrypt the message with the arg and the message flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: undefined,
							repeatPrompt: true,
						},
						data: {
							source: 'file:./message.txt',
						},
					});
					expect(
						cryptography.encryptMessageWithPassphrase,
					).to.be.calledWithExactly(
						defaultInputs.data,
						defaultInputs.passphrase,
						defaultRecipientPublicKey,
					);
					return expect(printMethodStub).to.be.calledWithExactly({
						...defaultEncryptedMessage,
						recipientPublicKey: defaultRecipientPublicKey,
					});
				},
			);
	});

	describe('message:encrypt recipientPublicKey --message=file:./message.txt --passphrase=pass:"card earn shift valley learn scorpion cage select help title control satoshi"', () => {
		setupTest()
			.command([
				'message:encrypt',
				defaultRecipientPublicKey,
				'--message=file:./message.txt',
				'--passphrase=pass:"card earn shift valley learn scorpion cage select help title control satoshi"',
			])
			.it(
				'should encrypt the message with the arg and the message flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source:
								'pass:"card earn shift valley learn scorpion cage select help title control satoshi"',
							repeatPrompt: true,
						},
						data: {
							source: 'file:./message.txt',
						},
					});
					expect(
						cryptography.encryptMessageWithPassphrase,
					).to.be.calledWithExactly(
						defaultInputs.data,
						defaultInputs.passphrase,
						defaultRecipientPublicKey,
					);
					return expect(printMethodStub).to.be.calledWithExactly({
						...defaultEncryptedMessage,
						recipientPublicKey: defaultRecipientPublicKey,
					});
				},
			);
	});
});
