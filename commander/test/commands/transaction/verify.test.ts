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
import * as readerUtils from '../../../src/utils/reader';

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
		nonce: '0',
		fee: '10000000',
		senderId: '2129300327344985743L',
		signatures: [
			'483cc0efdb019d4910ea577d44d95f7115c4bfe179a26d3f8bbbca4d9141b38143d85219a5a9cb5eff712553e0ec2e2cf3f3b570fd841030aa7289b995a1c301',
		],
		id: '6721820474838816958',
	};

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
			.stdout();

	describe('transaction:verify', () => {
		setupTest()
			.stub(
				readerUtils,
				'readStdIn',
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

	describe('transaction | transaction:verify', () => {
		setupTest()
			.stub(readerUtils, 'readStdIn', sandbox.stub().resolves([]))
			.command(['transaction:verify'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error when no stdin was provided');

		setupTest()
			.stub(
				readerUtils,
				'readStdIn',
				sandbox.stub().resolves([invalidTransaction]),
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
				readerUtils,
				'readStdIn',
				sandbox.stub().resolves([JSON.stringify(defaultTransaction)]),
			)
			.command(['transaction:verify'])
			.it('should verify transaction from stdin', () => {
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultVerifyTransactionResult,
				);
			});
	});
});
