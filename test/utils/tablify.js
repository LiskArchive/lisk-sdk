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
import tablify from '../../src/utils/tablify';

describe('#tablify', () => {
	it('should create a table from an object', () => {
		const data = {
			one: 'two',
			three: 'four',
		};
		const table = tablify(data);

		(table).should.have.property('0').eql({ one: 'two' });
		(table).should.have.property('1').eql({ three: 'four' });
	});

	it('should create a table from an empty object', () => {
		const data = {};
		const table = tablify(data);

		(table).should.not.have.property('0');
	});
});
