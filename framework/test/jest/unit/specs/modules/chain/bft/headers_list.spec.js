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
} = require('../../../../../../../src/modules/chain/bft/headers_list');
const {
	BlockHeader: blockHeaderFixture,
} = require('../../../../../../mocha/fixtures/blocks');

describe('HeadersList', () => {
	let list;
	const SIZE = 5;

	beforeEach(async () => {
		list = new HeadersList({ size: SIZE });
	});

	describe('constructor()', () => {
		it('should set set the object attributes', async () => {
			expect(list._size).toEqual(SIZE);
			expect(list._items).toEqual([]);
		});
	});

	describe('add()', () => {
		it('should return the list object after push to chain', async () => {
			const header = blockHeaderFixture();
			const returnValue = list.add(header);

			expect(returnValue).toEqual(list);
		});

		it('should add the block header to items', async () => {
			const header = blockHeaderFixture();
			list.add(header);

			expect(list.items).toEqual([header]);
		});

		it('should add the block header to items in higher order', async () => {
			const header1 = blockHeaderFixture({ height: 10 });
			const header2 = blockHeaderFixture({ height: 11 });

			list.add(header1).add(header2);
			expect(list.items).toEqual([header1, header2]);
		});

		it('should add the block header to items in lower order', async () => {
			const header1 = blockHeaderFixture({ height: 10 });
			const header2 = blockHeaderFixture({ height: 11 });

			list.add(header2).add(header1);
			expect(list.items).toEqual([header1, header2]);
		});

		it('should throw error if block header added is not one step higher than last item', async () => {
			const header1 = blockHeaderFixture({ height: 10 });
			const header2 = blockHeaderFixture({ height: 11 });
			const header3 = blockHeaderFixture({ height: 13 });

			list.add(header1).add(header2);

			expect(() => {
				list.add(header3);
			}).toThrow(
				'Block header with height 12 or 9 can only be added at the moment, you provided 13 height'
			);
		});

		it('should throw error if block header added is not one step less than first item', async () => {
			const header1 = blockHeaderFixture({ height: 10 });
			const header2 = blockHeaderFixture({ height: 9 });
			const header3 = blockHeaderFixture({ height: 7 });

			list.add(header1).add(header2);

			expect(() => {
				list.add(header3);
			}).toThrow(
				'Block header with height 11 or 8 can only be added at the moment, you provided 7 height'
			);
		});

		it('should keep headers pushed in sequence', async () => {
			const header1 = blockHeaderFixture({ height: 10 });
			const header2 = blockHeaderFixture({ height: 11 });
			const header3 = blockHeaderFixture({ height: 12 });

			list.add(header1);
			list.add(header2);
			list.add(header3);

			expect(list.items).toEqual([header1, header2, header3]);
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

			expect(list.items).toEqual([header2, header3, header4, header5, header6]);
		});
	});

	describe('remove()', () => {
		let header1;
		let header2;
		let header3;
		let header4;
		let header5;

		beforeEach(async () => {
			header1 = blockHeaderFixture({ height: 1 });
			header2 = blockHeaderFixture({ height: 2 });
			header3 = blockHeaderFixture({ height: 3 });
			header4 = blockHeaderFixture({ height: 4 });
			header5 = blockHeaderFixture({ height: 5 });

			list
				.add(header1)
				.add(header2)
				.add(header3)
				.add(header4)
				.add(header5);

			expect(list.items).toEqual([header1, header2, header3, header4, header5]);
		});

		it('should remove last item from the list if passed without height', async () => {
			list.remove();
			expect(list.items).toEqual([header1, header2, header3, header4]);
		});

		it('should remove all items above provided aboveHeight', async () => {
			list.remove({ aboveHeight: 2 });
			expect(list.items).toEqual([header1, header2]);
		});

		it('should return removed items if removed one', async () => {
			const removedItems = list.remove();

			expect(removedItems).toEqual([header5]);
		});

		it('should return removed items if removed multiple', async () => {
			const removedItems = list.remove({ aboveHeight: 2 });

			expect(removedItems).toEqual([header3, header4, header5]);
		});

		it('should empty the list if remove is called number of items item in the list', async () => {
			list.remove();
			list.remove();
			list.remove();
			list.remove();
			list.remove();

			expect(list.items).toEqual([]);
		});

		it('should not throw any error if called on empty list', async () => {
			list.remove();
			list.remove();
			list.remove();
			list.remove();
			list.remove();

			expect(list.items).toEqual([]);

			expect(() => {
				list.remove();
			}).not.toThrow();
		});

		it('should empty the list if provided height is less than the first item height', async () => {
			const myList = new HeadersList({ size: SIZE });
			myList
				.add(header3)
				.add(header4)
				.add(header5);
			myList.remove({ aboveHeight: 1 });

			expect(myList.items).toEqual([]);
		});
	});

	describe('size', () => {
		let header1;
		let header2;
		let header3;
		let header4;
		let header5;

		beforeEach(async () => {
			header1 = blockHeaderFixture({ height: 1 });
			header2 = blockHeaderFixture({ height: 2 });
			header3 = blockHeaderFixture({ height: 3 });
			header4 = blockHeaderFixture({ height: 4 });
			header5 = blockHeaderFixture({ height: 5 });

			list
				.add(header1)
				.add(header2)
				.add(header3)
				.add(header4)
				.add(header5);

			expect(list.items).toEqual([header1, header2, header3, header4, header5]);
		});

		it('should return the current size of the list', async () => {
			expect(list.size).toEqual(SIZE);
		});

		it('should increase the size without effecting list', async () => {
			list.size = 10;
			expect(list.size).toEqual(10);
			expect(list.items).toEqual([header1, header2, header3, header4, header5]);
		});

		it('should decrease the  size by chopping the headers with lowest height', async () => {
			list.size = 2;
			expect(list.size).toEqual(2);
			expect(list.items).toEqual([header4, header5]);
		});
	});

	describe('reset()', () => {
		let header1;
		let header2;
		let header3;
		let header4;
		let header5;

		beforeEach(async () => {
			header1 = blockHeaderFixture({ height: 1 });
			header2 = blockHeaderFixture({ height: 2 });
			header3 = blockHeaderFixture({ height: 3 });
			header4 = blockHeaderFixture({ height: 4 });
			header5 = blockHeaderFixture({ height: 5 });

			list
				.add(header1)
				.add(header2)
				.add(header3)
				.add(header4)
				.add(header5);

			expect(list.items).toEqual([header1, header2, header3, header4, header5]);
		});

		it('should empty the list', async () => {
			list.empty();

			expect(list.items).toEqual([]);
		});
		it('should return all items when empty the list', async () => {
			const returnValue = list.empty();

			expect(returnValue).toEqual([
				header1,
				header2,
				header3,
				header4,
				header5,
			]);
		});
	});

	describe('top()', () => {
		let header1;
		let header2;
		let header3;
		let header4;
		let header5;

		beforeEach(async () => {
			header1 = blockHeaderFixture({ height: 1 });
			header2 = blockHeaderFixture({ height: 2 });
			header3 = blockHeaderFixture({ height: 3 });
			header4 = blockHeaderFixture({ height: 4 });
			header5 = blockHeaderFixture({ height: 5 });

			list
				.add(header1)
				.add(header2)
				.add(header3)
				.add(header4)
				.add(header5);

			expect(list.items).toEqual([header1, header2, header3, header4, header5]);
		});

		it('should throw error if size is not provided', async () => {
			expect(() => list.top()).toThrow('Please provide the size');
		});

		it('should return top headers', async () => {
			expect(list.top(3)).toEqual([header3, header4, header5]);
		});
	});
});
