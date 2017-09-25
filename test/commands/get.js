/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import get from '../../src/commands/get';
import query from '../../src/utils/query';
import { setUpVorpalWithCommand } from './utils';

const tablify = require('../../src/utils/tablify');

const testCommandCallsQueryMethodWithValue = (
	vorpal, command, queryMethodName, value, stubResolutionValue,
) => {
	const stub = sandbox.stub(query, queryMethodName).resolves(stubResolutionValue);

	return vorpal.exec(command)
		.then(() => (stub.calledWithExactly(value)).should.be.equal(true));
};

describe('lisky get command palette', () => {
	const address = '13133549779353512613L';
	const blockId = '3641049113933914102';
	const delegateName = 'lightcurve';
	const transactionId = '16388447461355055139';

	const noTypeCommand = 'get';
	const noInputCommand = 'get account';
	const invalidTypeCommand = `get xxx ${address}`;
	const accountCommand = `get account ${address}`;
	const addressCommand = `get address ${address}`;
	const blockCommand = `get block ${blockId}`;
	const delegateCommand = `get delegate ${delegateName}`;
	const transactionCommand = `get transaction ${transactionId}`;

	const missingRequiredArgumentRegex = /Missing required argument/;
	const unknownVariableRegex = /Unsupported type\./;

	let vorpal;
	let capturedOutput = [];

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(get, capturedOutput);
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
		capturedOutput = [];
	});

	describe('queries', () => {
		it('should handle being called with no type', () => {
			return vorpal.exec(noTypeCommand)
				.then(result => (result).should.match(missingRequiredArgumentRegex));
		});

		it('should handle being called with no variadic', () => {
			return vorpal.exec(noInputCommand)
				.then(result => (result).should.match(missingRequiredArgumentRegex));
		});

		it('should handle unknown type names', () => {
			return vorpal.exec(invalidTypeCommand)
				.then(() => (capturedOutput[0]).should.match(unknownVariableRegex));
		});

		it('should get an account by address', () => {
			return testCommandCallsQueryMethodWithValue(vorpal, accountCommand, 'isAccountQuery', address, { account: {} });
		});

		it('should get an address', () => {
			return testCommandCallsQueryMethodWithValue(vorpal, addressCommand, 'isAccountQuery', address, { account: {} });
		});

		it('should get a block by id', () => {
			return testCommandCallsQueryMethodWithValue(vorpal, blockCommand, 'isBlockQuery', blockId, { block: {} });
		});

		it('should get a delegate by name', () => {
			return testCommandCallsQueryMethodWithValue(vorpal, delegateCommand, 'isDelegateQuery', delegateName, { delegate: {} });
		});

		it('should get a transaction by id', () => {
			return testCommandCallsQueryMethodWithValue(vorpal, transactionCommand, 'isTransactionQuery', transactionId, { transaction: {} });
		});

		it('should handle http errors', () => {
			const error = 'Transaction not found';
			sandbox.stub(query, 'isTransactionQuery').resolves({ error });

			return vorpal.exec(transactionCommand)
				.then(() => (capturedOutput[0]).should.match(new RegExp(error)));
		});
	});

	describe('options', () => {
		const jsonCommand = `${transactionCommand} -j`;
		const noJsonCommand = `${transactionCommand} --no-json`;
		const transaction = {
			one: 'two',
		};

		beforeEach(() => {
			sandbox.stub(query, 'isTransactionQuery').resolves({ transaction });
		});

		describe('json output true', () => {
			it('should stringify JSON', () => {
				const spy = sandbox.spy(JSON, 'stringify');
				return vorpal.exec(jsonCommand)
					.then(() => {
						(spy.calledWithExactly(transaction)).should.be.true();
					});
			});

			it('should print json output', () => {
				return vorpal.exec(jsonCommand)
					.then(() => {
						(capturedOutput[0]).should.be.type('string');
						(JSON.parse.bind(null, capturedOutput[0])).should.not.throw();
					});
			});
		});

		describe('json output false', () => {
			it('should use tablify', () => {
				const spy = sandbox.spy(tablify, 'default');
				return vorpal.exec(noJsonCommand)
					.then(() => {
						(spy.calledWithExactly(transaction)).should.be.true();
					});
			});

			it('should print tablified output', () => {
				return vorpal.exec(noJsonCommand)
					.then(() => {
						(capturedOutput[0]).should.be.type('string');
						(JSON.parse.bind(null, capturedOutput[0])).should.throw(/Unexpected token/);
					});
			});
		});
	});
});
