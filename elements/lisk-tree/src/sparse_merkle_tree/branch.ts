/*
 * Copyright © 2021 Lisk Foundation
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

import { Leaf } from './leaf';
import { branchHash } from './utils';
import { NodeSide } from './constants';

export class Branch {
	private _left: Leaf;
	private _right: Leaf;
	private _hash: Buffer;
	public constructor(left: Leaf, right: Leaf) {
		this._left = left;
		this._right = right;
		this._hash = branchHash(this._left.hash, this._right.hash);
	}

	public get hash() {
		return this._hash;
	}
	public get left() {
		return this._left;
	}
	public get right() {
		return this._right;
	}
	public update(newChild: Leaf, nodeSide: NodeSide) {
		if (nodeSide === NodeSide.LEFT) {
			this._left = newChild;
		} else {
			this._right = newChild;
		}
		this._hash = branchHash(this.left.hash, this._right.hash);
	}
}
