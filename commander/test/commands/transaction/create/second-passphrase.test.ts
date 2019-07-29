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

describe('transaction:create:second-passphrase', () => {
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
				'registerSecondPassphrase',
				sandbox.stub().returns(defaultTransaction),
			)
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:create:second-passphrase', () => {
		setupTest()
			.command(['transaction:create:second-passphrase'])
			.it('should create second passphrase transaction', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: {
						source: undefined,
						repeatPrompt: true,
					},
				});
				expect(transactions.registerSecondPassphrase).to.be.calledWithExactly(
					defaultInputs,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:second-passphrase --passphrase=xxx', () => {
		setupTest()
			.command([
				'transaction:create:second-passphrase',
				'--passphrase=pass:123',
			])
			.it(
				'should create second passphrase transaction with passphrase from flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: {
							source: undefined,
							repeatPrompt: true,
						},
					});
					expect(transactions.registerSecondPassphrase).to.be.calledWithExactly(
						defaultInputs,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});

	describe('transaction:create:second-passphrase --passphrase=xxx --second-passphrase=xxx', () => {
		setupTest()
			.command([
				'transaction:create:second-passphrase',
				'--passphrase=pass:123',
				'--second-passphrase=pass:456',
			])
			.it(
				'should create second passphrase transaction with passphrase and second passphrase from flag',
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
					expect(transactions.registerSecondPassphrase).to.be.calledWithExactly(
						defaultInputs,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});

	describe('transaction:create:second-passphrase --no-signature', () => {
		setupTest()
			.command(['transaction:create:second-passphrase', '--no-signature'])
			.it(
				'should create second passphrase transaction withoug passphrase',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: undefined,
						secondPassphrase: {
							source: undefined,
							repeatPrompt: true,
						},
					});
					expect(transactions.registerSecondPassphrase).to.be.calledWithExactly(
						defaultInputs,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});
});
