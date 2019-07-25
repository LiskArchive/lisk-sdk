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

describe('message:sign', () => {
	const message = 'Hello World';
	const defaultSignedMessage = {
		message,
		publicKey:
			'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
		signature:
			'0c70c0ed6ca16312c6acab46dd8b801fd3f3a2bd68018651c2792b40a7d1d3ee276a6bafb6b4185637edfa4d282e18362e135c5e2cf0c68002bfd58307ddb30b',
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
				'signMessageWithPassphrase',
				sandbox.stub().returns(defaultSignedMessage),
			)
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('message:sign', () => {
		setupTest()
			.command(['message:sign'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('No message was provided.');
			})
			.it('should throw an error');
	});

	describe('message:sign message', () => {
		setupTest()
			.command(['message:sign', message])
			.it('should sign the message with the arg', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					data: undefined,
				});
				expect(cryptography.signMessageWithPassphrase).to.be.calledWithExactly(
					message,
					defaultInputs.passphrase,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedMessage,
				);
			});
	});

	describe('message:sign --message=file:./message.txt', () => {
		const messageSource = 'file:/message.txt';
		setupTest()
			.command(['message:sign', `--message=${messageSource}`])
			.it('should sign the message from flag', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					data: {
						source: messageSource,
					},
				});
				expect(cryptography.signMessageWithPassphrase).to.be.calledWithExactly(
					defaultInputs.data,
					defaultInputs.passphrase,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedMessage,
				);
			});
	});

	describe('message:sign --message=file:./message.txt --passphrase=pass:"card earn shift valley learn scorpion cage select help title control satoshi"', () => {
		const messageSource = 'file:/message.txt';
		const passphraseSource =
			'pass:"card earn shift valley learn scorpion cage select help title control satoshi"';
		setupTest()
			.command([
				'message:sign',
				`--message=${messageSource}`,
				`--passphrase=${passphraseSource}`,
			])
			.it('should sign the message from the flag and passphrase', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: passphraseSource,
						repeatPrompt: true,
					},
					data: {
						source: messageSource,
					},
				});
				expect(cryptography.signMessageWithPassphrase).to.be.calledWithExactly(
					defaultInputs.data,
					defaultInputs.passphrase,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedMessage,
				);
			});
	});
});
