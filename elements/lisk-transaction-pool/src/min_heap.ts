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
import { Node } from './node';

export class MinHeap<T, K = bigint | number> {
	protected _nodes: Array<Node<T, K>>;

	public constructor(heap?: MinHeap<T, K>) {
		this._nodes = [];
		if (heap) {
			this._insertAll(heap);
		}
	}

	public push(key: K, value: T): void {
		const node = new Node<T, K>(key, value);
		this._nodes.push(node);
		this._moveUp(this._nodes.length - 1);
	}

	public pop(): { key: K; value: T } | undefined {
		if (this.count <= 0) {
			return undefined;
		}
		if (this.count === 1) {
			const node = this._nodes[0];
			this.clear();

			return node;
		}
		const rootNode = this._nodes[0];
		this._nodes[0] = this._nodes.pop() as Node<T, K>;
		this._moveDown(0);

		return rootNode;
	}

	public peek(): { key: K; value: T } | undefined {
		if (this._nodes.length <= 0) {
			return undefined;
		}

		return this._nodes[0];
	}

	public clone(): MinHeap<T, K> {
		return new MinHeap(this);
	}

	public clear(): void {
		this._nodes = [];
	}

	public get count(): number {
		return this._nodes.length;
	}

	public get keys(): ReadonlyArray<K> {
		return this._nodes.map(n => n.key);
	}

	public get values(): ReadonlyArray<T> {
		return this._nodes.map(n => n.value);
	}

	public getAllNodes(): ReadonlyArray<Node<T, K>> {
		return [...this._nodes];
	}

	private _insertAll(heap: MinHeap<T, K>): void {
		if (!(heap instanceof MinHeap)) {
			throw new Error('Only heap instance can be inserted');
		}
		this._insertAllFromHeap(heap);
	}

	private _insertAllFromHeap(heap: MinHeap<T, K>): void {
		const keys = heap.keys;
		const values = heap.values;
		if (this.count <= 0) {
			// Assume that the order of input heap is correct
			// tslint:disable-next-line no-let
			for (let i = 0; i < heap.count; i += 1) {
				this._nodes.push(new Node(keys[i], values[i]));
			}

			return;
		}
		// tslint:disable-next-line no-let
		for (let i = 0; i < heap.count; i += 1) {
			this.push(keys[i], values[i]);
		}
	}

	protected _moveUp(originalIndex: number): void {
		// tslint:disable-next-line no-let
		let index = originalIndex;
		const node = this._nodes[index];
		while (index > 0) {
			const parentIndex = this._parentIndex(index);
			if (this._nodes[parentIndex].key > node.key) {
				this._nodes[index] = this._nodes[parentIndex];
				index = parentIndex;
				continue;
			}
			break;
		}
		this._nodes[index] = node;
	}

	protected _moveDown(originalIndex: number): void {
		// tslint:disable-next-line no-let
		let index = originalIndex;

		const node = this._nodes[index];
		// tslint:disable-next-line no-bitwise
		const halfCount = this.count >> 1;

		while (index < halfCount) {
			const leftChild = this._leftChildIndex(index);
			const rightChild = this._rightChildIndex(index);
			// Choose smaller path
			const nextPath =
				rightChild < this.count &&
				this._nodes[rightChild].key < this._nodes[leftChild].key
					? rightChild
					: leftChild;

			if (this._nodes[nextPath].key > node.key) {
				break;
			}

			this._nodes[index] = this._nodes[nextPath];
			index = nextPath;
		}
		this._nodes[index] = node;
	}

	// tslint:disable-next-line prefer-function-over-method
	protected _parentIndex(index: number): number {
		// Equivalent to index / 2 when index is integer
		// tslint:disable-next-line no-bitwise
		return (index - 1) >> 1;
	}

	// tslint:disable-next-line prefer-function-over-method
	protected _leftChildIndex(index: number): number {
		// tslint:disable-next-line no-magic-numbers
		return index * 2 + 1;
	}

	// tslint:disable-next-line prefer-function-over-method
	protected _rightChildIndex(index: number): number {
		// tslint:disable-next-line no-magic-numbers
		return index * 2 + 2;
	}
}
