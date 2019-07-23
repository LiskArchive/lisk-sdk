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

describe('transaction:create:transfer', () => {
	const defaultAmount = '1';
	const defaultAddress = '123L';
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
	const transactionUtilStub = {
		validateAddress: sandbox.stub().returns(true),
		convertLSKToBeddows: sandbox.stub().returns(defaultTransaction.amount),
	};

	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(
				transactions,
				'transfer',
				sandbox.stub().returns(defaultTransaction),
			)
			.stub(transactions, 'utils', transactionUtilStub)
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:create:transfer', () => {
		setupTest()
			.command(['transaction:create:transfer'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 2 required args');
			})
			.it('should throw an error');
	});

	describe('transaction:create:transfer amount', () => {
		setupTest()
			.command(['transaction:create:transfer', defaultAmount])
			.catch(error => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error');
	});

	describe('transaction:create:transfer amount address', () => {
		setupTest()
			.command(['transaction:create:transfer', defaultAmount, defaultAddress])
			.it('should create a transfer transaction', () => {
				expect(transactionUtilStub.validateAddress).to.be.calledWithExactly(
					defaultAddress,
				);
				expect(transactionUtilStub.convertLSKToBeddows).to.be.calledWithExactly(
					defaultAmount,
				);
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:transfer amount address --data=xxx', () => {
		setupTest()
			.command([
				'transaction:create:transfer',
				defaultAmount,
				defaultAddress,
				'--data=Testing lisk transaction data.',
			])
			.it('should create a transfer transaction', () => {
				expect(transactionUtilStub.validateAddress).to.be.calledWithExactly(
					defaultAddress,
				);
				expect(transactionUtilStub.convertLSKToBeddows).to.be.calledWithExactly(
					defaultAmount,
				);
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:transfer amount address --no-signature', () => {
		setupTest()
			.command([
				'transaction:create:transfer',
				defaultAmount,
				defaultAddress,
				'--no-signature',
			])
			.it('should create a transfer transaction without signature', () => {
				expect(transactionUtilStub.validateAddress).to.be.calledWithExactly(
					defaultAddress,
				);
				expect(transactionUtilStub.convertLSKToBeddows).to.be.calledWithExactly(
					defaultAmount,
				);
				expect(inputUtils.getInputsFromSources).not.to.be.called;
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:transfer amount address --passphrase=xxx', () => {
		setupTest()
			.command([
				'transaction:create:transfer',
				defaultAmount,
				defaultAddress,
				'--passphrase=pass:123',
			])
			.it('should create a transfer transaction', () => {
				expect(transactionUtilStub.validateAddress).to.be.calledWithExactly(
					defaultAddress,
				);
				expect(transactionUtilStub.convertLSKToBeddows).to.be.calledWithExactly(
					defaultAmount,
				);
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: 'pass:123',
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:transfer amount address --passphrase=xxx --second-passphrase=xxx', () => {
		setupTest()
			.command([
				'transaction:create:transfer',
				defaultAmount,
				defaultAddress,
				'--passphrase=pass:123',
				'--second-passphrase=pass:456',
			])
			.it('should create a transfer transaction', () => {
				expect(transactionUtilStub.validateAddress).to.be.calledWithExactly(
					defaultAddress,
				);
				expect(transactionUtilStub.convertLSKToBeddows).to.be.calledWithExactly(
					defaultAmount,
				);
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
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});
});
