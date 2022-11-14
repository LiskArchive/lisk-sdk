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

const numberToQ = (base: bigint, val: number): bigint => {
	const denominator = TWO ** base;
	const int = Math.floor(val);
	if (Number.isInteger(val)) {
		return BigInt(val) * denominator;
	}
	const [, fractionalStr] = val.toString().split('.');
	return (
		BigInt(int) * denominator +
		(BigInt(fractionalStr) * denominator) / BigInt(10) ** BigInt(fractionalStr.length)
	);
};

export const q = (val: number | bigint | Buffer, base: number | bigint): Q =>
	Q.fromValue(val, base);

export class Q {
	private readonly _base: bigint;
	private readonly _val: bigint;

	public constructor(val: bigint, base: number | bigint) {
		this._base = BigInt(base);
		if (this._base > MAX_FRAC) {
			throw new Error('Base exceeds max fraction allowed.');
		}
		this._val = val;
		this._base = BigInt(base);
	}

	public static fromValue(val: number | bigint | Buffer | Q, base: number | bigint) {
		if (val instanceof Q) {
			return new Q(val._val, val._base);
		}
		const bigintBase = BigInt(base);
		if (typeof val === 'number') {
			return new Q(numberToQ(bigintBase, val), bigintBase);
		}
		if (typeof val === 'bigint') {
			return new Q(val * TWO ** bigintBase, bigintBase);
		}
		return new Q(BigInt(`0x${val.toString('hex')}`), bigintBase);
	}

	public add(n: Q) {
		if (this._base !== n._base) {
			throw new Error('Base of input does not match.');
		}
		return new Q(this._val + n._val, this._base);
	}

	public sub(n: Q) {
		if (this._base !== n._base) {
			throw new Error('Invalid input, base does not match.');
		}
		if (this._val < n._val) {
			throw new Error('Invalid input, output cannot be negative.');
		}
		return new Q(this._val - n._val, this._base);
	}

	public mul(n: Q) {
		if (this._base !== n._base) {
			throw new Error('Invalid input, base does not match.');
		}
		return new Q((this._val * n._val) >> this._base, this._base);
	}

	public div(n: Q) {
		if (this._base !== n._base) {
			throw new Error('Invalid input, base does not match.');
		}
		return new Q((this._val << this._base) / n._val, this._base);
	}

	public muldiv(n: Q, m: Q) {
		if (this._base !== n._base || this._base !== m._base) {
			throw new Error('Invalid input, base does not match.');
		}
		const x = this._val * n._val;
		const y = x << this._base;
		const z = y / m._val;

		return new Q(this._roundDown(z), this._base);
	}

	public inv() {
		const numerator = new Q(ONE << this._base, this._base);
		return numerator.div(this);
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
}
