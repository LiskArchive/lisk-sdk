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
import lisk from '../../src/utils/liskInstance';
import query from '../../src/utils/query';

describe('Query class', () => {
	let stub;

	beforeEach(() => {
		stub = sandbox.stub(lisk, 'sendRequest');
	});

	it('#isBlockQuery should get a block by id', () => {
		const route = 'blocks/get';
		const id = '5650160629533476718';
		const options = { id };

		query.isBlockQuery(id);

		(stub.calledWithExactly(route, options)).should.be.true();
	});

	it('#isAccountQuery should get an account by address', () => {
		const route = 'accounts';
		const address = '13782017140058682841L';
		const options = { address };

		query.isAccountQuery(address);

		(stub.calledWithExactly(route, options)).should.be.true();
	});

	it('#isTransactionQuery should get a transaction by id', () => {
		const route = 'transactions/get';
		const id = '16388447461355055139';
		const options = { id };

		query.isTransactionQuery(id);

		(stub.calledWithExactly(route, options)).should.be.true();
	});

	it('#isDelegateQuery should get a delegate by username', () => {
		const route = 'delegates/get';
		const username = 'lightcurve';
		const options = { username };

		query.isDelegateQuery(username);

		(stub.calledWithExactly(route, options)).should.be.true();
	});
});
