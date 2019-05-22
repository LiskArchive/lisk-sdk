/*
 * Copyright © 2018 Lisk Foundation
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
 */

'use strict';

const {
	HeadersList,
} = require('../../../../../../src/modules/chain/logic/bft');
const {
	BlockHeader: blockHeaderFixture,
} = require('../../../../fixtures/blocks');

describe('bft', () => {
	describe('HeadersQueue', () => {
		let list;
		const SIZE = 5;

		beforeEach(async () => {
			list = new HeadersList({ size: SIZE });
		});

		describe('constructor()', () => {
			it('should set set the object attributes', async () => {
				expect(list.size).to.eql(SIZE);
				expect(list.items).to.eql([]);
			});
		});

		describe('add()', () => {
			it('should return the list object after push to chain', async () => {
				const header = blockHeaderFixture();
				const returnValue = list.add(header);

				expect(returnValue).to.be.eql(list);
			});

			it('should add the block header to items', async () => {
				const header = blockHeaderFixture();
				list.add(header);

				expect(list.items).to.be.eql([header]);
			});

			it('should add the block header to items in higher order', async () => {
				const header1 = blockHeaderFixture({ height: 10 });
				const header2 = blockHeaderFixture({ height: 11 });

				list.add(header1).add(header2);
				expect(list.items).to.be.eql([header1, header2]);
			});

			it('should add the block header to items in lower order', async () => {
				const header1 = blockHeaderFixture({ height: 10 });
				const header2 = blockHeaderFixture({ height: 11 });

				list.add(header2).add(header1);
				expect(list.items).to.be.eql([header1, header2]);
			});

			it('should throw error if block header added is not one step higher than last item', async () => {
				const header1 = blockHeaderFixture({ height: 10 });
				const header2 = blockHeaderFixture({ height: 11 });
				const header3 = blockHeaderFixture({ height: 13 });

				list.add(header1).add(header2);

				expect(() => {
					list.add(header3);
				}).to.throw(
					'Block header with height 12 or 9 can be added at the moment'
				);
			});

			it('should throw error if block header added is not one step less than first item', async () => {
				const header1 = blockHeaderFixture({ height: 10 });
				const header2 = blockHeaderFixture({ height: 9 });
				const header3 = blockHeaderFixture({ height: 7 });

				list.add(header1).add(header2);

				expect(() => {
					list.add(header3);
				}).to.throw(
					'Block header with height 11 or 8 can be added at the moment'
				);
			});

			it('should keep headers pushed in sequence', async () => {
				const header1 = blockHeaderFixture({ height: 10 });
				const header2 = blockHeaderFixture({ height: 11 });
				const header3 = blockHeaderFixture({ height: 12 });

				list.add(header1);
				list.add(header2);
				list.add(header3);

				expect(list.items).to.eql([header1, header2, header3]);
			});

			it('should remove the first header if list size increased', async () => {
				const header1 = blockHeaderFixture({ height: 1 });
				const header2 = blockHeaderFixture({ height: 2 });
				const header3 = blockHeaderFixture({ height: 3 });
				const header4 = blockHeaderFixture({ height: 4 });
				const header5 = blockHeaderFixture({ height: 5 });
				const header6 = blockHeaderFixture({ height: 6 });

				list
					.add(header1)
					.add(header2)
					.add(header3)
					.add(header4)
					.add(header5)
					.add(header6);

				expect(list.items).to.be.eql([
					header2,
					header3,
					header4,
					header5,
					header6,
				]);
			});
		});
	});
});
