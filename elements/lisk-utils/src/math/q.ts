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

import { ONE, Q_OPERATION, TWO, ZERO } from './constants';

const numberToQ = (base: bigint, val: number): bigint => {
	if (Number.isInteger(val)) {
		return BigInt(val) << base;
	}
	const [intStr, fractionalStr] = val.toString().split('.');
	return (
		(BigInt(intStr) << base) +
		(BigInt(fractionalStr) << base) / BigInt(10) ** BigInt(fractionalStr.length)
	);
};

export const q = (val: number | bigint | Buffer, base: number | bigint): Q =>
	Q.fromValue(val, base);

export class Q {
	private readonly _base: bigint;
	private readonly _val: bigint;

	public constructor(val: bigint, base: number | bigint) {
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
		this._checkBase(n);

		return new Q(this._val + n._val, this._base);
	}

	public sub(n: Q) {
		this._checkBase(n);
		if (this._val < n._val) {
			throw new Error('Invalid input, output cannot be negative.');
		}

		return new Q(this._val - n._val, this._base);
	}

	public mul(n: Q) {
		this._checkBase(n);

		return new Q(this._roundDown(this._val * n._val), this._base);
	}

	public div(n: Q) {
		this._checkBase(n);
		if (n._val === ZERO) {
			throw new Error('Cannot be divided by zero.');
		}

		return new Q((this._val << this._base) / n._val, this._base);
	}

	public muldiv(n: Q, m: Q, operation: Q_OPERATION = Q_OPERATION.ROUND_DOWN) {
		this._checkBase(n);
		this._checkBase(m);
		if (m._val === ZERO) {
			throw new Error('Cannot be divided by zero.');
		}

		const mulResult = this._val * n._val;
		const scaledResult = mulResult << this._base;
		const divResult = scaledResult / m._val;

		if (operation === Q_OPERATION.ROUND_DOWN) {
			return new Q(this._roundDown(divResult), this._base);
		}
		return new Q(this._roundUp(divResult), this._base);
	}

	public inv() {
		const numerator = new Q(ONE << this._base, this._base);
		return numerator.div(this);
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

	public floor(): bigint {
		return this._roundDown(this._val);
	}

	public ceil(): bigint {
		return this._roundUp(this._val);
	}

	private _checkBase(n: Q) {
		if (this._base !== n._base) {
			throw new Error('Invalid input, base does not match.');
		}
	}

	private _roundDown(n: bigint) {
		return n >> this._base;
	}

	private _roundUp(n: bigint) {
		const result = n >> this._base;
		// Result is multiple of 2 ** base (ie: integer)
		if (n % (ONE << this._base) === BigInt(0)) {
			return result;
		}
		return result + ONE;
	}
}
