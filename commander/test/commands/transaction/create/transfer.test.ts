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
import * as sandbox from 'sinon';
import { expect, test } from '@oclif/test';
import * as transactions from '@liskhq/lisk-transactions';
import * as validator from '@liskhq/lisk-validator';
import * as config from '../../../../src/utils/config';
import * as printUtils from '../../../../src/utils/print';
import * as readerUtils from '../../../../src/utils/reader';

// This needs to be re-implemented using base64 with https://github.com/LiskHQ/lisk-core/issues/254
// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('transaction:create:transfer', () => {
	const defaultAmount = '1';
	const defaultAddress = '123L';
	const defaultInputs = '123';
	const defaultTransaction = {
		nonce: '0',
		fee: '10000000',
		amount: '10000000000',
		recipientId: '123L',
		senderPublicKey: null,
		type: 0,
		asset: {},
	};

	const printMethodStub = sandbox.stub();
	const transactionUtilStub = {
		convertLSKToBeddows: sandbox.stub().returns(defaultTransaction.amount),
	};

	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({ api: { network: 'test' } }))
			.stub(transactions, 'transfer', sandbox.stub().returns(defaultTransaction))
			.stub(transactions, 'utils', transactionUtilStub)
			.stub(validator, 'validateAddress', sandbox.stub().returns(true))
			.stub(readerUtils, 'getPassphraseFromPrompt', sandbox.stub().resolves(defaultInputs))
			.stdout();

	describe('transaction:create:transfer', () => {
		setupTest()
			.command(['transaction:create:transfer'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 4 required args');
			})
			.it('should throw an error');
	});

	describe('transaction:create:transfer amount', () => {
		setupTest()
			.command(['transaction:create:transfer', defaultAmount])
			.catch(error => {
				return expect(error.message).to.contain('Missing 3 required arg');
			})
			.it('should throw an error');
	});

	describe('transaction:create:transfer amount address', () => {
		setupTest()
			.command(['transaction:create:transfer', '1', '100', defaultAmount, defaultAddress])
			.it('should create a transfer transaction', () => {
				expect(validator.validateAddress).to.be.calledWithExactly(defaultAddress);
				expect(transactionUtilStub.convertLSKToBeddows).to.be.calledWithExactly(defaultAmount);
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly('passphrase', true);
				return expect(printMethodStub).to.be.calledWithExactly(defaultTransaction);
			});
	});

	describe('transaction:create:transfer amount address --data=xxx', () => {
		setupTest()
			.command([
				'transaction:create:transfer',
				'1',
				'100',
				defaultAmount,
				defaultAddress,
				'--data=Testing lisk transaction data.',
			])
			.it('should create a transfer transaction', () => {
				expect(validator.validateAddress).to.be.calledWithExactly(defaultAddress);
				expect(transactionUtilStub.convertLSKToBeddows).to.be.calledWithExactly(defaultAmount);
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly('passphrase', true);

				return expect(printMethodStub).to.be.calledWithExactly(defaultTransaction);
			});
	});

	describe('transaction:create:transfer amount address --no-signature', () => {
		setupTest()
			.command([
				'transaction:create:transfer',
				'1',
				'100',
				defaultAmount,
				defaultAddress,
				'--no-signature',
			])
			.it('should create a transfer transaction without signature', () => {
				expect(validator.validateAddress).to.be.calledWithExactly(defaultAddress);
				expect(transactionUtilStub.convertLSKToBeddows).to.be.calledWithExactly(defaultAmount);
				expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
				return expect(printMethodStub).to.be.calledWithExactly(defaultTransaction);
			});
	});

	describe('transaction:create:transfer amount address --passphrase=xxx', () => {
		setupTest()
			.command([
				'transaction:create:transfer',
				'1',
				'100',
				defaultAmount,
				defaultAddress,
				'--passphrase=123',
			])
			.it('should create a transfer transaction', () => {
				expect(validator.validateAddress).to.be.calledWithExactly(defaultAddress);
				expect(transactionUtilStub.convertLSKToBeddows).to.be.calledWithExactly(defaultAmount);
				expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
				return expect(printMethodStub).to.be.calledWithExactly(defaultTransaction);
			});
	});
});
