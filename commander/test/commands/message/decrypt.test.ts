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

describe('message:decrypt', () => {
	const message = 'Hello World';
	const defaultSenderPublicKey =
		'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
	const defaultNonce = '0ec64b2146336a62c9938475308411f00688f9d12c5d33a0';
	const defaultEncryptedMessage =
		'c9d369291997bf34abe505d48ac394175b68fc90f8f1d16fd1351e';

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
				'decryptMessageWithPassphrase',
				sandbox.stub().returns(message),
			)
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('message:decrypt', () => {
		setupTest()
			.command(['message:decrypt'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('Missing 2 required arg');
			})
			.it('should throw an error');
	});

	describe('message:decrypt senderPublicKey', () => {
		setupTest()
			.command(['message:decrypt', defaultSenderPublicKey])
			.catch((error: Error) => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error');
	});

	describe('message:decrypt senderPublicKey nonce', () => {
		setupTest()
			.command(['message:decrypt', defaultSenderPublicKey, defaultNonce])
			.catch((error: Error) => {
				return expect(error.message).to.contain('No message was provided.');
			})
			.it('should throw an error');
	});

	describe('message:decrypt senderPublicKey nonce message', () => {
		setupTest()
			.command([
				'message:decrypt',
				defaultSenderPublicKey,
				defaultNonce,
				defaultEncryptedMessage,
			])
			.it('should decrypt the message with the arg', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
					},
					data: undefined,
				});
				expect(
					cryptography.decryptMessageWithPassphrase,
				).to.be.calledWithExactly(
					defaultEncryptedMessage,
					defaultNonce,
					defaultInputs.passphrase,
					defaultSenderPublicKey,
				);
				return expect(printMethodStub).to.be.calledWithExactly({ message });
			});
	});

	describe('message:decrypt senderPublicKey nonce --message=file:./message.txt', () => {
		setupTest()
			.command([
				'message:decrypt',
				defaultSenderPublicKey,
				defaultNonce,
				'--message=file:./message.txt',
			])
			.it(
				'should decrypt the message with the arg and the message flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: undefined,
						},
						data: {
							source: 'file:./message.txt',
						},
					});
					expect(
						cryptography.decryptMessageWithPassphrase,
					).to.be.calledWithExactly(
						defaultInputs.data,
						defaultNonce,
						defaultInputs.passphrase,
						defaultSenderPublicKey,
					);
					return expect(printMethodStub).to.be.calledWithExactly({ message });
				},
			);
	});

	describe('message:decrypt senderPublicKey nonce --message=file:./message.txt --passphrase=pass:"card earn shift valley learn scorpion cage select help title control satoshi"', () => {
		setupTest()
			.command([
				'message:decrypt',
				defaultSenderPublicKey,
				defaultNonce,
				'--message=file:./message.txt',
				'--passphrase=pass:"card earn shift valley learn scorpion cage select help title control satoshi"',
			])
			.it(
				'should decrypt the message with the arg and the message flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source:
								'pass:"card earn shift valley learn scorpion cage select help title control satoshi"',
						},
						data: {
							source: 'file:./message.txt',
						},
					});
					expect(
						cryptography.decryptMessageWithPassphrase,
					).to.be.calledWithExactly(
						defaultInputs.data,
						defaultNonce,
						defaultInputs.passphrase,
						defaultSenderPublicKey,
					);
					return expect(printMethodStub).to.be.calledWithExactly({ message });
				},
			);
	});
});
