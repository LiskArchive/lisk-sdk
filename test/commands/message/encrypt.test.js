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

describe('message:encrypt', () => {
	const message = 'Hello World';
	const defaultRecipientPublicKey =
		'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
	const defaultEncryptedMessage = {
		nonce: '0ec64b2146336a62c9938475308411f00688f9d12c5d33a0',
		message: 'c9d369291997bf34abe505d48ac394175b68fc90f8f1d16fd1351e',
	};

	const defaultInputs = {
		passphrase: '123',
		data: 'message',
	};

	const printMethodStub = sandbox.stub();
	const setupStub = test
		.stub(print, 'default', sandbox.stub().returns(printMethodStub))
		.stub(config, 'getConfig', sandbox.stub().returns({}))
		.stub(
			cryptography,
			'encryptMessage',
			sandbox.stub().returns(defaultEncryptedMessage),
		)
		.stub(
			getInputsFromSources,
			'default',
			sandbox.stub().resolves(defaultInputs),
		);

	describe('message:encrypt', () => {
		setupStub
			.stdout()
			.command(['message:encrypt'])
			.catch(error =>
				expect(error.message).to.contain('Missing 1 required arg'),
			)
			.it('should throw an error');
	});

	describe('message:encrypt recipient', () => {
		setupStub
			.stdout()
			.command(['message:encrypt', defaultRecipientPublicKey])
			.catch(error =>
				expect(error.message).to.contain('No message was provided.'),
			)
			.it('should throw an error');
	});

	describe('message:encrypt recipient message', () => {
		setupStub
			.stdout()
			.command(['message:encrypt', defaultRecipientPublicKey, message])
			.it('should encrypt the message with the arg', () => {
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					data: null,
				});
				expect(cryptography.encryptMessage).to.be.calledWithExactly({
					message,
					passphrase: defaultInputs.passphrase,
					recipient: defaultRecipientPublicKey,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultEncryptedMessage,
				);
			});
	});

	describe('message:encrypt recipient --message=file:./message.txt', () => {
		setupStub
			.stdout()
			.command([
				'message:encrypt',
				defaultRecipientPublicKey,
				'--message=file:./message.txt',
			])
			.it(
				'should encrypt the message with the arg and the message flag',
				() => {
					expect(getInputsFromSources.default).to.be.calledWithExactly({
						passphrase: {
							source: undefined,
							repeatPrompt: true,
						},
						data: {
							source: 'file:./message.txt',
						},
					});
					expect(cryptography.encryptMessage).to.be.calledWithExactly({
						message: defaultInputs.data,
						passphrase: defaultInputs.passphrase,
						recipient: defaultRecipientPublicKey,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultEncryptedMessage,
					);
				},
			);
	});

	describe('message:encrypt recipient --message=file:./message.txt --passphrase=pass:123', () => {
		setupStub
			.stdout()
			.command([
				'message:encrypt',
				defaultRecipientPublicKey,
				'--message=file:./message.txt',
				'--passphrase=pass:123',
			])
			.it(
				'should encrypt the message with the arg and the message flag',
				() => {
					expect(getInputsFromSources.default).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						data: {
							source: 'file:./message.txt',
						},
					});
					expect(cryptography.encryptMessage).to.be.calledWithExactly({
						message: defaultInputs.data,
						passphrase: defaultInputs.passphrase,
						recipient: defaultRecipientPublicKey,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultEncryptedMessage,
					);
				},
			);
	});
});
