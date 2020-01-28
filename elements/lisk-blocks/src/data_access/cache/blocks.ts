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
import * as assert from 'assert';

import { BlockHeader } from '../../types';

import { Cache } from './cache';

export class Blocks extends Cache<BlockHeader> {
	public constructor(size: number = 500) {
		super(size);
	}

	public add(blockHeader: BlockHeader): BlockHeader[] {
		if (this.items.length) {
			assert(
				blockHeader.height === this.last.height + 1,
				`Block header with height ${this.last.height +
					1} can only be added, insted received ${blockHeader.height} height`,
			);
		}

		if (this.first && blockHeader.height === this.last.height + 1) {
			this.items.push(blockHeader);
		}

		// If the list size is already full remove one item
		if (this.items.length > this.size) {
			this.items.shift();
		}

		return this.items;
	}

	public getByID(id: string): BlockHeader | undefined {
		return this.items.find(block => block.id === id);
	}

	public getByHeight(height: number): BlockHeader | undefined {
		return this.items.find(block => block.height === height);
	}

	public getByIDs(ids: ReadonlyArray<string>): BlockHeader[] {
		const blocks = this.items.filter(block => ids.includes(block.id));

		if (blocks.length === ids.length) {
			return blocks;
		}

		return [];
	}

	public getByHeights(heightList: ReadonlyArray<number>): BlockHeader[] {
		const blocks = this.items.filter(block =>
			heightList.includes(block.height),
		);

		if (blocks.length === heightList.length) {
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

	public getLastBlockHeader(): BlockHeader {
		return this.last;
	}

	public getLastCommonBlockHeader(
		ids: ReadonlyArray<string>,
	): BlockHeader | undefined {
		const blocks = this.getByIDs(ids);

		if (!blocks.length) {
			return undefined;
		}

		return blocks[blocks.length - 1];
	}
}
