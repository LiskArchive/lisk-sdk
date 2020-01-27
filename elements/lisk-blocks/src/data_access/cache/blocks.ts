/*
 * Copyright © 2019 Lisk Foundation
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

import { BlockHeader } from '../../types';

import { Cache } from './cache';

export class Blocks extends Cache<BlockHeader> {
	public constructor(size: number = 500) {
		super(size);
	}

	public getById(id: string): BlockHeader | undefined {
		return this.items.find(block => block.id === id);
	}

	public getByIds(ids: ReadonlyArray<string>): BlockHeader[] {
		const blocks = this.items.filter(block => ids.includes(block.id));

		if (blocks.length === ids.length) {
			return blocks;
		}

		return [];
	}

	public getByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): BlockHeader[] {
		if (
			this.items.find(b => b.height === fromHeight) &&
			this.items.find(b => b.height === toHeight)
		) {
			return this.items.filter(
				block => block.height >= fromHeight && block.height <= toHeight,
			);
		}

		return [];
	}

	public getLastCommonBlockHeader(ids: ReadonlyArray<string>): BlockHeader {
		const blocks = this.getByIds(ids);

		return blocks[blocks.length - 1];
	}
}
