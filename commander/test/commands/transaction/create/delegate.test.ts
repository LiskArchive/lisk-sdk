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
import * as transactions from '@liskhq/lisk-transactions';
import * as config from '../../../../src/utils/config';
import * as printUtils from '../../../../src/utils/print';
import * as inputUtils from '../../../../src/utils/input';

describe('transaction:create:delegate', () => {
	const defaultUsername = 'user-light';
	const defaultInputs = {
		passphrase: '123',
		secondPassphrase: '456',
	};
	const defaultTransaction = {
		amount: '10000000000',
		recipientId: '123L',
		senderPublicKey: null,
		timestamp: 66492418,
		type: 0,
		fee: '10000000',
		recipientPublicKey: null,
		asset: {},
	};

	const printMethodStub = sandbox.stub();

	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(
				transactions,
				'registerDelegate',
				sandbox.stub().returns(defaultTransaction),
			)
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:create:delegate', () => {
		setupTest()
			.command(['transaction:create:delegate'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error');
	});

	describe('transaction:create:delegate username', () => {
		setupTest()
			.command(['transaction:create:delegate', defaultUsername])
			.it('create a transaction with the username', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				expect(transactions.registerDelegate).to.be.calledWithExactly({
					passphrase: defaultInputs.passphrase,
					secondPassphrase: defaultInputs.secondPassphrase,
					username: defaultUsername,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:delegate username --passphrase=xxx', () => {
		setupTest()
			.command([
				'transaction:create:delegate',
				defaultUsername,
				'--passphrase=pass:123',
			])
			.it(
				'create a transaction with the username with the passphrase from flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: undefined,
					});
					expect(transactions.registerDelegate).to.be.calledWithExactly({
						passphrase: defaultInputs.passphrase,
						secondPassphrase: defaultInputs.secondPassphrase,
						username: defaultUsername,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});

	describe('transaction:create:delegate username --passphrase=xxx --second-passphrase=xxx', () => {
		setupTest()
			.command([
				'transaction:create:delegate',
				defaultUsername,
				'--passphrase=pass:123',
				'--second-passphrase=pass:456',
			])
			.it(
				'create a transaction with the username and the passphrase and second passphrase from the flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: {
							source: 'pass:456',
							repeatPrompt: true,
						},
					});
					expect(transactions.registerDelegate).to.be.calledWithExactly({
						passphrase: defaultInputs.passphrase,
						secondPassphrase: defaultInputs.secondPassphrase,
						username: defaultUsername,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});

	describe('transaction:create:delegate username --no-signature', () => {
		setupTest()
			.command([
				'transaction:create:delegate',
				defaultUsername,
				'--no-signature',
			])
			.it('create a transaction with the username without signature', () => {
				expect(transactions.registerDelegate).to.be.calledWithExactly({
					passphrase: undefined,
					secondPassphrase: undefined,
					username: defaultUsername,
				});
				expect(inputUtils.getInputsFromSources).not.to.be.called;
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});
});
