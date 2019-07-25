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
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';
import * as inputUtils from '../../../src/utils/input/utils';

describe('transaction:verify', () => {
	const defaultTransaction = {
		amount: '10000000000',
		recipientId: '123L',
		senderPublicKey:
			'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
		timestamp: 66419917,
		type: 0,
		fee: '10000000',
		recipientPublicKey: null,
		asset: {},
		signature:
			'96738e173a750998f4c2cdcdf7538b71854bcffd6c0dc72b3c28081ca6946322bea7ba5d8f8974fc97950014347ce379671a6eddc0d41ea6cdfb9bb7ff76be0a',
		id: '1297455432474089551',
	};
	const defaultSecondPublicKey =
		'790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951';
	const invalidTransaction = 'invalid transaction';

	const defaultVerifyTransactionResult = {
		verified: true,
	};

	const printMethodStub = sandbox.stub();
	const transactionUtilStub = {
		verifyTransaction: sandbox.stub().returns(true),
	};
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(transactions, 'utils', transactionUtilStub)
			.stub(
				inputUtils,
				'getData',
				sandbox.stub().resolves(defaultSecondPublicKey),
			)
			.stdout();

	describe('transaction:verify', () => {
		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().rejects(new Error('Timeout error')),
			)
			.command(['transaction:verify'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error');
	});

	describe('transaction:verify transaction', () => {
		setupTest()
			.command(['transaction:verify', invalidTransaction])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error for invalid JSON');

		setupTest()
			.command(['transaction:verify', JSON.stringify(defaultTransaction)])
			.it('should verify transaction from arg', () => {
				expect(transactionUtilStub.verifyTransaction).to.be.calledWithExactly(
					defaultTransaction,
					undefined,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultVerifyTransactionResult,
				);
			});
	});

	describe('transaction:verify transaction --second-public-key=xxx', () => {
		setupTest()
			.command([
				'transaction:verify',
				JSON.stringify(defaultTransaction),
				'--second-public-key=file:key.txt',
			])
			.it(
				'should verify transaction from arg and second public key from an external source',
				() => {
					expect(inputUtils.getData).to.be.calledWithExactly('file:key.txt');
					expect(transactionUtilStub.verifyTransaction).to.be.calledWithExactly(
						defaultTransaction,
						defaultSecondPublicKey,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultVerifyTransactionResult,
					);
				},
			);

		setupTest()
			.command([
				'transaction:verify',
				JSON.stringify(defaultTransaction),
				'--second-public-key=some-second-public-key',
			])
			.it(
				'should verify transaction from arg and second public key from the flag',
				() => {
					expect(inputUtils.getData).not.to.be.called;
					expect(transactionUtilStub.verifyTransaction).to.be.calledWithExactly(
						defaultTransaction,
						'some-second-public-key',
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultVerifyTransactionResult,
					);
				},
			);
	});

	describe('transaction | transaction:verify', () => {
		setupTest()
			.stub(inputUtils, 'getStdIn', sandbox.stub().resolves({}))
			.command(['transaction:verify'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error when no stdin was provided');

		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().resolves({ data: invalidTransaction }),
			)
			.command(['transaction:verify'])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error when invalid JSON format was provided');

		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command(['transaction:verify'])
			.it('should verify transaction from stdin', () => {
				expect(transactionUtilStub.verifyTransaction).to.be.calledWithExactly(
					defaultTransaction,
					undefined,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultVerifyTransactionResult,
				);
			});
	});

	describe('transaction | transaction:verify --second-public-key=xxx', () => {
		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command(['transaction:verify', '--second-public-key=file:key.txt'])
			.it(
				'should verify transaction from stdin and the second public key flag',
				() => {
					expect(inputUtils.getData).to.be.calledWithExactly('file:key.txt');
					expect(transactionUtilStub.verifyTransaction).to.be.calledWithExactly(
						defaultTransaction,
						defaultSecondPublicKey,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultVerifyTransactionResult,
					);
				},
			);
	});
});
