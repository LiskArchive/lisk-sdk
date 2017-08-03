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
import list from '../../src/commands/list';
import query from '../../src/utils/query';
import { setUpVorpalWithCommand } from './utils';

const tablify = require('../../src/utils/tablify');

const createRejectionHandler = restoreFn => (e) => {
	restoreFn();
	throw e;
};

const testCommandCallsQueryMethodWithValues = (
	vorpal, command, queryMethodName, values,
) => {
	const stub = sinon.stub(query, queryMethodName);
	const { restore } = stub;

	return vorpal.exec(command)
		.then(() => values.forEach(value =>
			(stub.calledWithExactly(value))
				.should.be.equal(true)),
		)
		.then(restore, createRejectionHandler(restore));
};

describe('lisky list command palette', () => {
	const addresses = ['13133549779353512613L', '13133549779353512613L'];
	const blockIds = ['3641049113933914102', '5650160629533476718'];
	const delegateNames = ['lightcurve', 'tosch'];
	const transactionIds = ['16388447461355055139', '14735719251498448056'];

	const noTypeCommand = 'list';
	const noVariadicCommand = 'list accounts';
	const invalidTypeCommand = `list xxx ${addresses.join(' ')}`;
	const accountsCommand = `list accounts ${addresses.join(' ')}`;
	const addressesCommand = `list addresses ${addresses.join(' ')}`;
	const blocksCommand = `list blocks ${blockIds.join(' ')}`;
	const delegatesCommand = `list delegates ${delegateNames.join(' ')}`;
	const transactionsCommand = `list transactions ${transactionIds.join(' ')}`;

	const missingRequiredArgumentRegex = /Missing required argument/;
	const unknownVariableRegex = /Unsupported type\./;
	const error = 'Something went wrong.';

	let vorpal;
	let capturedOutput = [];

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(list, capturedOutput);
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
		capturedOutput = [];
	});

	it('should handle being called with no type', () => {
		return vorpal.exec(noTypeCommand)
			.then(result => (result).should.match(missingRequiredArgumentRegex));
	});

	it('should handle being called with no variadic', () => {
		return vorpal.exec(noVariadicCommand)
			.then(result => (result).should.match(missingRequiredArgumentRegex));
	});

	it('should handle unknown type names', () => {
		return vorpal.exec(invalidTypeCommand)
			.then(() => (capturedOutput[0]).should.match(unknownVariableRegex));
	});

	it('should handle errors', () => {
		const { restore } = sinon.stub(query, 'isTransactionQuery').resolves({ error });
		return vorpal.exec(transactionsCommand)
			.then(() => {
				(capturedOutput[0]).should.match(/error/);
				(capturedOutput[0]).should.match(new RegExp(error));
			})
			.then(restore, createRejectionHandler(restore));
	});

	it('should list accounts by address', () => {
		return testCommandCallsQueryMethodWithValues(vorpal, accountsCommand, 'isAccountQuery', addresses);
	});

	it('should list addresses', () => {
		return testCommandCallsQueryMethodWithValues(vorpal, addressesCommand, 'isAccountQuery', addresses);
	});

	it('should list blocks by id', () => {
		return testCommandCallsQueryMethodWithValues(vorpal, blocksCommand, 'isBlockQuery', blockIds);
	});

	it('should list delegates by name', () => {
		return testCommandCallsQueryMethodWithValues(vorpal, delegatesCommand, 'isDelegateQuery', delegateNames);
	});

	it('list transactions by id', () => {
		return testCommandCallsQueryMethodWithValues(vorpal, transactionsCommand, 'isTransactionQuery', transactionIds);
	});

	describe('options', () => {
		const jsonCommand = `${transactionsCommand} -j`;
		const noJsonCommand = `${transactionsCommand} --no-json`;
		const transaction = {
			one: 'two',
			three: 'four',
			five: 'six',
		};
		let stub;

		beforeEach(() => {
			stub = sinon.stub(query, 'isTransactionQuery').resolves({ transaction });
		});

		afterEach(() => {
			stub.restore();
		});

		describe('json output true', () => {
			it('should stringify JSON', () => {
				const spy = sinon.spy(JSON, 'stringify');
				const { restore } = spy;
				return vorpal.exec(jsonCommand)
					.then(() => {
						(spy.calledWithExactly([transaction, transaction])).should.be.true();
					})
					.then(restore, createRejectionHandler(restore));
			});

			it('should print json output', () => {
				return vorpal.exec(jsonCommand)
					.then(() => {
						const output = capturedOutput[0];
						(output).should.be.type('string');
						(JSON.parse.bind(null, output)).should.not.throw();

						const outputJSON = JSON.parse(output);
						(outputJSON).should.have.property('length').be.equal(2);
						outputJSON.forEach(printedTransaction =>
							(printedTransaction).should.eql(transaction),
						);
					});
			});
		});

		describe('json output false', () => {
			it('should use tablify', () => {
				const spy = sinon.spy(tablify, 'default');
				const { restore } = spy;
				return vorpal.exec(noJsonCommand)
					.then(() => {
						(spy.calledWithExactly([transaction, transaction])).should.be.true();
					})
					.then(restore, createRejectionHandler(restore));
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
