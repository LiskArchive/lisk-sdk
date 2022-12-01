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
import { MaxHeap } from '../../src/data_structures/max_heap';

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
			expect(heap.peek()?.key).toBe(5);
		});

		it('should have correct count', () => {
			expect(heap.count).toBe(4);
		});
	});

	describe('pop', () => {
		it('should pop minimal values', () => {
			const root = heap.pop();
			expect(heap.count).toBe(3);
			expect(root?.key).toBe(5);
			expect(root?.value).toBe('b');
		});

		it('should pop in correct order', () => {
			const nodes = [];
			nodes.push(heap.pop());
			nodes.push(heap.pop());
			nodes.push(heap.pop());
			nodes.push(heap.pop());
			expect(nodes[0]?.key).toBe(5);
			expect(nodes[1]?.key).toBe(2);
			expect(nodes[2]?.key).toBe(1);
			expect(nodes[3]?.key).toBe(0);
			expect(heap.count).toBe(0);
		});

		it('should remove minimal values', () => {
			const root = heap.pop();
			expect(heap.count).toBe(3);
			expect(root?.key).toBe(5);
			expect(root?.value).toBe('b');
		});
	});

	describe('peek', () => {
		it('should return root values', () => {
			expect(heap.peek()?.key).toBe(5);
			expect(heap.peek()?.value).toBe('b');
		});

		it('should not remove the root values', () => {
			const { count } = heap;
			heap.peek();
			expect(heap.count).toEqual(count);
		});
	});
});
