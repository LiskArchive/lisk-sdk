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
 */

import { Proof } from './types';

export class MarkleTree {
	// eslint-disable-next-line
	private _root: Buffer;
	// eslint-disable-next-line
	public constructor(_initValues: Buffer[]) {
		this._root = Buffer.alloc(0);
	}

	public get root(): Buffer {
		if (this._root.length === 0) {
			throw new Error('Root has not been calculated');
		}
		return this._root;
	}

	// eslint-disable-next-line
	public append(_value: Buffer): { key: Buffer; value: Buffer }[] {
		return [];
	}

	// eslint-disable-next-line
	public generateProof(_queryData: ReadonlyArray<Buffer>): Proof {
		// eslint-disable-next-line
		return {} as any;
	}
}
