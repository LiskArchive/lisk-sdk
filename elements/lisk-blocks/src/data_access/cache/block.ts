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

import { Base } from './base';

export class BlockCache extends Base<BlockHeader> {
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
		} else {
			this.items.unshift(blockHeader);
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

	public getByIDs(ids: ReadonlyArray<string>): BlockHeader[] {
		const blocks = this.items.filter(block => ids.includes(block.id));

		if (blocks.length === ids.length) {
			return blocks;
		}

		return [];
	}

	public getByHeight(height: number): BlockHeader | undefined {
		return this.items.find(block => block.height === height);
	}

	public getByHeights(heightList: ReadonlyArray<number>): BlockHeader[] {
		const blocks = this.items.filter(block =>
			heightList.includes(block.height),
		);

		// Only return results if complete match to avoid inconsistencies
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
			toHeight >= fromHeight &&
			this.items.length &&
			fromHeight >= this.first.height && toHeight <= this.last.height
		) {
			return this.items.filter(
				block => block.height >= fromHeight && block.height <= toHeight,
			);
		}

		return [];
	}
}
