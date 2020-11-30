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
import { MinHeap } from './min_heap';

export class MaxHeap<T, K = bigint | number> extends MinHeap<T, K> {
	protected _moveUp(originalIndex: number): void {
		let index = originalIndex;
		const node = this._nodes[index];
		while (index > 0) {
			const parentIndex = this._parentIndex(index);
			if (this._nodes[parentIndex].key < node.key) {
				this._nodes[index] = this._nodes[parentIndex];
				index = parentIndex;
				continue;
			}
			break;
		}
		this._nodes[index] = node;
	}

	protected _moveDown(originalIndex: number): void {
		let index = originalIndex;
		const node = this._nodes[index];
		// eslint-disable-next-line no-bitwise
		const halfCount = this.count >> 1;

		while (index < halfCount) {
			const leftChild = this._leftChildIndex(index);
			const rightChild = this._rightChildIndex(index);
			// Choose smaller path
			const nextPath =
				rightChild < this.count && this._nodes[rightChild].key > this._nodes[leftChild].key
					? rightChild
					: leftChild;

			if (this._nodes[nextPath].key < node.key) {
				break;
			}

			this._nodes[index] = this._nodes[nextPath];
			index = nextPath;
		}
		this._nodes[index] = node;
	}
}
