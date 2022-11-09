/* eslint-disable no-bitwise */
/*
 * Copyright © 2022 Lisk Foundation
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

import { MAX_FRAC, ONE, Q_OPERATION, TWO } from './constants';

export class Q {
	private readonly _base: bigint;
	private _val: bigint;

	public constructor(val: number | bigint | Buffer, base: number | bigint = 96) {
		this._base = BigInt(base);
		if (this._base > MAX_FRAC) {
			throw new Error('Base exceeds max fraction allowed.');
		}
		if (typeof val === 'number') {
			this._val = this._numberToQ(val);
			return;
		}
		if (typeof val === 'bigint') {
			this._val = val * TWO ** this._base;
			return;
		}
		this._val = BigInt(`0x${val.toString('hex')}`);
	}

	public add(n: Q) {
		if (this._base !== n._base) {
			throw new Error('Base of input does not match.');
		}
		this._val += n._val;
		return this;
	}

	public sub(n: Q) {
		if (this._base !== n._base) {
			throw new Error('Invalid input, base does not match.');
		}
		if (this._val < n._val) {
			throw new Error('Invalid input, output cannot be negative.');
		}
		this._val -= n._val;
		return this;
	}

	public mul(n: Q) {
		if (this._base !== n._base) {
			throw new Error('Invalid input, base does not match.');
		}
		this._val = (this._val * n._val) >> this._base;
		return this;
	}

	public div(n: Q) {
		if (this._base !== n._base) {
			throw new Error('Invalid input, base does not match.');
		}
		this._val = (this._val << this._base) / n._val;
		return this;
	}

	public mulDiv(n: Q, m: Q) {
		if (this._base !== n._base || this._base !== m._base) {
			throw new Error('Invalid input, base does not match.');
		}
		const x = this._val * n._val;
		const y = x << this._base;
		const z = y / m._val;

		this._val = this._roundDown(z);
		return this;
	}

	public inv() {
		const x = new Q(0, this._base);
		// create new instance and directly mutate the value to insert Q notation directly
		x._val = ONE << this._base;
		return x.div(this);
	}

	public toInt(operation: Q_OPERATION = Q_OPERATION.ROUND_DOWN) {
		if (operation === Q_OPERATION.ROUND_DOWN) {
			return this._roundDown(this._val);
		}
		return this._roundUp(this._val);
	}

	public toBuffer(): Buffer {
		return Buffer.from(this._val.toString(16), 'hex');
	}

	public eq(n: Q): boolean {
		return this._val === n._val;
	}

	public lt(n: Q): boolean {
		return this._val < n._val;
	}

	public lte(n: Q): boolean {
		return this._val <= n._val;
	}

	public gt(n: Q): boolean {
		return this._val > n._val;
	}

	public gte(n: Q): boolean {
		return this._val >= n._val;
	}

	private _roundDown(n: bigint) {
		return n >> this._base;
	}

	private _roundUp(n: bigint) {
		const x = ONE << this._base;
		const y = n % x;

		if (y === BigInt(0)) {
			return n >> this._base;
		}

		const r = n >> this._base;
		return r + ONE;
	}

	private _numberToQ(val: number): bigint {
		const denominator = TWO ** this._base;
		const int = Math.floor(val);
		const decimals = val - int;
		if (decimals === 0) {
			return BigInt(val) * denominator;
		}
		const [_, binaryStr] = decimals.toString(2).split('.');
		let result = BigInt(int) * denominator;
		for (let i = 0; i < this._base; i += 1) {
			if (binaryStr.length <= i) {
				return result;
			}
			result += TWO ** (this._base - BigInt(i + 1)) * BigInt(binaryStr[i]);
		}
		return result;
	}
}
