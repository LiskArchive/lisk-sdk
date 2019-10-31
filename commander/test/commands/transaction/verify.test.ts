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
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';
import * as inputUtils from '../../../src/utils/input/utils';

describe('transaction:verify', () => {
	const defaultTransaction = {
		type: 8,
		senderPublicKey:
			'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
		timestamp: 54316325,
		asset: {
			recipientId: '18141291412139607230L',
			amount: '1234567890',
			data: 'random data',
		},
		fee: '10000000',
		senderId: '2129300327344985743L',
		signatures: [],
		signature:
			'b88d0408318d3bf700586116046c9101535ee76d2d4b6a5903ac31f5d302094ad4b08180105ff91882482d5d62ca48ba2ed281b75134b90110e1a98aed7efe0d',
		id: '3436168030012755419',
	};

	const defaultSecondSignedTransaction = {
		...defaultTransaction,
		id: '1856045075247127242',
		signSignature:
			'c4b0ca84aa4596401c3041a1638e670d6278e0e18949f027b3d7ede4f2f0a1685df7aec768b1a3c49acfe7ded9e7f5230998f06b0d58371bcba5a00695fb6901',
	};
	const defaultSecondPublicKey =
		'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe';
	const invalidTransaction = 'invalid transaction';

	const defaultVerifyTransactionResult = {
		verified: true,
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(
				config,
				'getConfig',
				sandbox.stub().returns({ api: { network: 'test' } }),
			)
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
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultVerifyTransactionResult,
				);
			});
	});

	describe('transaction:verify transaction --second-public-key=xxx', () => {
		setupTest()
			.command([
				'transaction:verify',
				JSON.stringify(defaultSecondSignedTransaction),
				'--second-public-key=file:key.txt',
			])
			.it(
				'should verify transaction from arg and second public key from an external source',
				() => {
					expect(inputUtils.getData).to.be.calledWithExactly('file:key.txt');
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultVerifyTransactionResult,
					);
				},
			);

		setupTest()
			.command([
				'transaction:verify',
				JSON.stringify(defaultSecondSignedTransaction),
				`--second-public-key=${defaultSecondPublicKey}`,
			])
			.it(
				'should verify transaction from arg and second public key from the flag',
				() => {
					expect(inputUtils.getData).not.to.be.called;
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
				sandbox
					.stub()
					.resolves({ data: JSON.stringify(defaultSecondSignedTransaction) }),
			)
			.command(['transaction:verify', '--second-public-key=file:key.txt'])
			.it(
				'should verify transaction from stdin and the second public key flag',
				() => {
					expect(inputUtils.getData).to.be.calledWithExactly('file:key.txt');
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultVerifyTransactionResult,
					);
				},
			);
	});
});
