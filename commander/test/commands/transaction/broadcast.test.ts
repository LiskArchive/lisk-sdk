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
import * as apiUtils from '../../../src/utils/api';
import * as inputUtils from '../../../src/utils/input/utils';

describe('transaction:broadcast', () => {
	const apiConfig = {
		nodes: ['http://local.host'],
		network: 'main',
	};
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

	const wrongTransaction = 'not json transaction';

	const defaultAPIResponse = {
		data: {
			message: 'success',
		},
	};

	const printMethodStub = sandbox.stub();
	const apiClientStub = {
		transactions: {
			broadcast: sandbox.stub().resolves(defaultAPIResponse),
		},
	};
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({ api: apiConfig }))
			.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
			.stdout();

	describe('transaction:broadcast', () => {
		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().rejects(new Error('Timeout error')),
			)
			.command(['transaction:broadcast'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error without transaction');
	});

	describe('transaction:broadcast transaction', () => {
		setupTest()
			.command(['transaction:broadcast', wrongTransaction])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error with invalid transaction');

		setupTest()
			.command(['transaction:broadcast', JSON.stringify(defaultTransaction)])
			.it('should broadcast the transaction', () => {
				expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
				expect(apiClientStub.transactions.broadcast).to.be.calledWithExactly(
					defaultTransaction,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultAPIResponse.data,
				);
			});
	});

	describe('transaction | transaction:broadcast', () => {
		setupTest()
			.stub(inputUtils, 'getStdIn', sandbox.stub().resolves({}))
			.command(['transaction:broadcast'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error with invalid transaction from stdin');

		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().resolves({ data: wrongTransaction }),
			)
			.command(['transaction:broadcast'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error with invalid transaction from stdin');

		setupTest()
			.stub(
				inputUtils,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command(['transaction:broadcast'])
			.it('should broadcast the transaction', () => {
				expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
				expect(apiClientStub.transactions.broadcast).to.be.calledWithExactly(
					defaultTransaction,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultAPIResponse.data,
				);
			});
	});
});
