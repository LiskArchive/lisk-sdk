/*
 * Copyright © 2020 Lisk Foundation
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
import { MaxHeap } from '../../src/max_heap';

describe('Min heap', () => {
	let heap: MaxHeap<string>;

	beforeEach(() => {
		heap = new MaxHeap<string>();
		heap.push(1, 'a');
		heap.push(5, 'b');
		heap.push(2, 'c');
		heap.push(0, 'd');
	});

	describe('push', () => {
		it('should insert into correct order', () => {
			expect(heap.peek()?.key).toEqual(5);
		});

		it('should have correct count', () => {
			expect(heap.count).toEqual(4);
		});
	});

	describe('pop', () => {
		it('should pop minimal values', () => {
			const root = heap.pop();
			expect(heap.count).toEqual(3);
			expect(root?.key).toEqual(5);
			expect(root?.value).toEqual('b');
		});

		it('should pop in correct order', () => {
			const nodes = [];
			nodes.push(heap.pop());
			nodes.push(heap.pop());
			nodes.push(heap.pop());
			nodes.push(heap.pop());
			expect(nodes[0]?.key).toEqual(5);
			expect(nodes[1]?.key).toEqual(2);
			expect(nodes[2]?.key).toEqual(1);
			expect(nodes[3]?.key).toEqual(0);
			expect(heap.count).toEqual(0);
		});

		it('should remove minimal values', () => {
			const root = heap.pop();
			expect(heap.count).toEqual(3);
			expect(root?.key).toEqual(5);
			expect(root?.value).toEqual('b');
		});
	});

	describe('peek', () => {
		it('should return root values', () => {
			expect(heap.peek()?.key).toEqual(5);
			expect(heap.peek()?.value).toEqual('b');
		});

		it('should not remove the root values', () => {
			const count = heap.count;
			heap.peek();
			expect(heap.count).toEqual(count);
		});
	});
});
