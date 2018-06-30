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
		passphrase: '123',
		data: 'message',
	};

	const printMethodStub = sandbox.stub();
	const setupStub = test
		.stub(print, 'default', sandbox.stub().returns(printMethodStub))
		.stub(config, 'getConfig', sandbox.stub().returns({}))
		.stub(
			cryptography,
			'signMessage',
			sandbox.stub().returns(defaultSignedMessage),
		)
		.stub(
			getInputsFromSources,
			'default',
			sandbox.stub().resolves(defaultInputs),
		);

	describe('message:sign', () => {
		setupStub
			.stdout()
			.command(['message:sign'])
			.catch(error =>
				expect(error.message).to.contain('No message was provided.'),
			)
			.it('should throw an error');
	});

	describe('message:sign message', () => {
		setupStub
			.stdout()
			.command(['message:sign', message])
			.it('should sign the message with the arg', () => {
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					data: null,
				});
				expect(cryptography.signMessage).to.be.calledWithExactly({
					message,
					passphrase: defaultInputs.passphrase,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedMessage,
				);
			});
	});

	describe('message:sign --message=file:./message.txt', () => {
		const messageSource = 'file:/message.txt';
		setupStub
			.stdout()
			.command(['message:sign', `--message=${messageSource}`])
			.it('should sign the message from flag', () => {
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					data: {
						source: messageSource,
					},
				});
				expect(cryptography.signMessage).to.be.calledWithExactly({
					message: defaultInputs.data,
					passphrase: defaultInputs.passphrase,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedMessage,
				);
			});
	});

	describe('message:sign --message=file:./message.txt --passphrase=pass:123', () => {
		const messageSource = 'file:/message.txt';
		const passphraseSource = 'pass:123';
		setupStub
			.stdout()
			.command([
				'message:sign',
				`--message=${messageSource}`,
				`--passphrase=${passphraseSource}`,
			])
			.it('should sign the message from the flag and passphrase', () => {
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					passphrase: {
						source: passphraseSource,
						repeatPrompt: true,
					},
					data: {
						source: messageSource,
					},
				});
				expect(cryptography.signMessage).to.be.calledWithExactly({
					message: defaultInputs.data,
					passphrase: defaultInputs.passphrase,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedMessage,
				);
			});
	});
});
