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
import { BlockHeader } from '../../block_header';
import { Base } from './base';

export class BlockCache extends Base<BlockHeader> {
	public add(blockHeader: BlockHeader): BlockHeader[] {
		if (this.items.length) {
			assert(
				blockHeader.height === this.last.height + 1,
				`Block header with height ${(
					this.last.height + 1
				).toString()} can only be added, instead received height ${blockHeader.height.toString()}`,
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (this.first && blockHeader.height === this.last.height + 1) {
			this.items.push(blockHeader);
		} else {
			this.items.unshift(blockHeader);
		}

		// If the list size is already full remove one item
		if (this.items.length > this.maxCachedItems) {
			this.items.shift();
		}

		return this.items;
	}

	// Refills cache up to maxCachedItems when minCachedItems is reached
	public refill(blockHeaders: BlockHeader[]): BlockHeader[] {
		this.items.unshift(...blockHeaders);
		this.needsRefill = false;

		return this.items;
	}

	public remove(id: Buffer): BlockHeader[] {
		if (this.items.length && !this.last.id.equals(id)) {
			throw new Error(
				`Failed to remove the block id: ${id.toString(
					'hex',
				)} which is not the last block header cached`,
			);
		}
		this.items.pop();
		// If less than the minimum configured cached items remain we need to flag re-fill
		if (this.items.length < this.minCachedItems) {
			this.needsRefill = true;
		}

		return this.items;
	}

	public getByID(id: Buffer): BlockHeader | undefined {
		return this.items.find(block => block.id.equals(id));
	}

	public getByIDs(ids: ReadonlyArray<Buffer>): BlockHeader[] {
		const blocks = this.items.filter(block => ids.find(id => id.equals(block.id)) !== undefined);

		if (blocks.length === ids.length) {
			return blocks.reverse();
		}

		return [];
	}

	public getByHeight(height: number): BlockHeader | undefined {
		return this.items.find(block => block.height === height);
	}

	public getByHeights(heightList: ReadonlyArray<number>): BlockHeader[] {
		const blocks = this.items.filter(block => heightList.includes(block.height));

		// Only return results if complete match to avoid inconsistencies
		if (blocks.length === heightList.length) {
			return blocks.reverse();
		}

		return [];
	}

	public getByHeightBetween(fromHeight: number, toHeight: number): BlockHeader[] {
		if (
			toHeight >= fromHeight &&
			this.items.length &&
			fromHeight >= this.first.height &&
			toHeight <= this.last.height
		) {
			return this.items
				.filter(block => block.height >= fromHeight && block.height <= toHeight)
				.reverse();
		}

		return [];
	}
}
