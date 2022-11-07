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

import { ONE } from './constants';

export class Q {
	private readonly _base: bigint;
	private readonly _val: bigint;

	public constructor(val: number | bigint | Buffer, base = BigInt(96)) {
		// TODO: check base limits
		this._base = base;
		if (typeof val === 'number') {
			this._val = BigInt(val);
		} else if (typeof val === 'bigint') {
			this._val = val;
		} else this._val = val.readBigUInt64BE();
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
		return new Q((this._base * n._base) >> this._base, this._base);
	}

	public div(n: Q) {
		if (this._base !== n._base) {
			throw new Error('Invalid input, base does not match.');
		}
		return new Q((this._val << this._base) / n._val, this._base);
	}

	public mulDivQ96(n: Q, m: Q) {
		if (this._base !== n._base || this._base !== m._base) {
			throw new Error('Invalid input, base does not match.');
		}
		const x = this._val * n._val;
		const y = x << this._base;
		const z = y / m._val;

		return new Q(this._roundDown(z), this._base);
	}

	public toInt(operation: 'roundDown' | 'roundUp') {
		if (operation === 'roundDown') {
			return this._roundDown(this._val);
		}
		return this._roundUp(this._val);
	}

	public inv(n: Q) {
		const x = new Q(ONE << this._base, this._base);
		return x.div(n);
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
