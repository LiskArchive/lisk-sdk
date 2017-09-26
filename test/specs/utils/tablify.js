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
import tablify from '../../../src/utils/tablify';

describe('#tablify', () => {
	it('should create a table from an object', () => {
		const data = {
			head1: 'one',
			head2: 'two',
		};
		const table = tablify(data);

		(table).should.have.property('options').have.property('head').eql(Object.keys(data));
		(table).should.have.property('0').eql(Object.values(data));
	});

	it('should create a table from an empty object', () => {
		const data = {};
		const table = tablify(data);

		(table).should.not.have.property('0');
	});

	it('should create a table from an array of objects', () => {
		const data = [
			{
				head1: 'one',
				head2: 'two',
			},
			{
				head1: 'three',
				head2: 'four',
			},
		];
		const table = tablify(data);

		(table).should.have.property('options').have.property('head').eql(Object.keys(data[0]));
		(table).should.have.property('0').eql(Object.values(data[0]));
		(table).should.have.property('1').eql(Object.values(data[1]));
	});

	it('should create a table from an array of objects with different keys', () => {
		// const nullField = '-';
		const data = [
			{
				head1: 'one',
				head2: 'two',
			},
			{
				head1: 'three',
				head3: 'four',
				head4: 'five',
				head5: 'six',
			},
		];

		const table = tablify(data);

		(table).should.have.property('options').have.property('head').eql(['head1', 'head2', 'head3', 'head4', 'head5']);
		(table).should.have.property('0').eql(['one', 'two', undefined, undefined, undefined]);
		(table).should.have.property('1').eql(['three', undefined, 'four', 'five', 'six']);
	});
});
