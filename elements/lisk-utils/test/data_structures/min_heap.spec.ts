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
import { MinHeap } from '../../src/data_structures/min_heap';

describe('Min heap', () => {
	let heap: MinHeap<string>;

	beforeEach(() => {
		heap = new MinHeap<string>();
		heap.push(1, 'a');
		heap.push(5, 'b');
		heap.push(2, 'c');
		heap.push(0, 'd');
	});

	describe('constructor', () => {
		it('should initialize count as zero', () => {
			const heap2 = new MinHeap<string>();
			expect(heap2.count).toBe(0);
		});

		it('should insert input to the heap', () => {
			const heap2 = new MinHeap<string>(heap);
			expect(heap2.count).toBe(4);
		});
	});

	describe('push', () => {
		it('should insert into correct order', () => {
			expect(heap.peek()?.key).toBe(0);
			expect(heap.peek()?.value).toBe('d');
		});
	});

	describe('pop', () => {
		it('should remove minimal key', () => {
			const root = heap.pop();
			expect(heap.count).toBe(3);

			expect(root?.key).toBe(0);
			expect(root?.value).toBe('d');
		});

		it('should pop in correct order', () => {
			const nodes = [];
			nodes.push(heap.pop());
			nodes.push(heap.pop());
			nodes.push(heap.pop());
			nodes.push(heap.pop());
			expect(nodes[0]?.key).toBe(0);
			expect(nodes[1]?.key).toBe(1);
			expect(nodes[2]?.key).toBe(2);
			expect(nodes[3]?.key).toBe(5);
			expect(heap.count).toBe(0);
		});

		it('should not throw error when over remove', () => {
			heap.pop();
			heap.pop();
			heap.pop();
			heap.pop();
			heap.pop();
			expect(heap.count).toBe(0);
			expect(heap.keys).toEqual([]);
			expect(heap.values).toEqual([]);
		});
	});

	describe('peek', () => {
		it('should return root node', () => {
			expect(heap.peek()?.key).toBe(0);
			expect(heap.peek()?.value).toBe('d');
		});
	});

	describe('clone', () => {
		it('should create clone instance', () => {
			const newHeap = heap.clone();
			newHeap.push(20, 'x');
			expect(newHeap.count).toEqual(heap.count + 1);
		});
	});

	describe('clear', () => {
		it('should clear all the instance', () => {
			heap.clear();
			expect(heap.count).toBe(0);
		});
	});
});
