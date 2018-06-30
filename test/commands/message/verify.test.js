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

describe('message:verify', () => {
	const message = 'Hello World';
	const defaultPublicKey =
		'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';
	const defaultSignature =
		'0c70c0ed6ca16312c6acab46dd8b801fd3f3a2bd68018651c2792b40a7d1d3ee276a6bafb6b4185637edfa4d282e18362e135c5e2cf0c68002bfd58307ddb30b';
	const defaultInputs = {
		passphrase: '123',
		data: 'message',
	};
	const defaultVerifyMessageResult = {
		verified: true,
	};

	const printMethodStub = sandbox.stub();
	const setupStub = test
		.stub(print, 'default', sandbox.stub().returns(printMethodStub))
		.stub(config, 'getConfig', sandbox.stub().returns({}))
		.stub(
			cryptography,
			'verifyMessage',
			sandbox.stub().returns(defaultVerifyMessageResult),
		)
		.stub(
			getInputsFromSources,
			'default',
			sandbox.stub().resolves(defaultInputs),
		);

	describe('message:verify', () => {
		setupStub
			.stdout()
			.command(['message:verify'])
			.catch(error =>
				expect(error.message).to.contain('Missing 2 required arg'),
			)
			.it('should throw an error');
	});

	describe('message:verify publicKey', () => {
		setupStub
			.stdout()
			.command(['message:verify', defaultPublicKey])
			.catch(error =>
				expect(error.message).to.contain('Missing 1 required arg'),
			)
			.it('should throw an error');
	});

	describe('message:verify publicKey signature', () => {
		setupStub
			.stdout()
			.command(['message:verify', defaultPublicKey, defaultSignature])
			.catch(error =>
				expect(error.message).to.contain('No message was provided.'),
			)
			.it('should throw an error');
	});

	describe('message:verify publicKey signature message', () => {
		setupStub
			.stdout()
			.command(['message:verify', defaultPublicKey, defaultSignature, message])
			.it('should verify message from the arg', () => {
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					data: null,
				});
				expect(cryptography.verifyMessage).to.be.calledWithExactly({
					publicKey: defaultPublicKey,
					signature: defaultSignature,
					message,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultVerifyMessageResult,
				);
			});
	});

	describe('message:verify publicKey signature --message=file:./message.txt', () => {
		const messageSource = 'file:/message.txt';
		setupStub
			.stdout()
			.command([
				'message:verify',
				defaultPublicKey,
				defaultSignature,
				`--message=${messageSource}`,
			])
			.it('should verify message from the flag', () => {
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					data: {
						source: messageSource,
					},
				});
				expect(cryptography.verifyMessage).to.be.calledWithExactly({
					publicKey: defaultPublicKey,
					signature: defaultSignature,
					message: defaultInputs.data,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultVerifyMessageResult,
				);
			});
	});
});
