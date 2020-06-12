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

interface SlotsInput {
	readonly genesisTime: number;
	readonly interval: number;
}

const SEC_IN_MS = 1000;

export class Slots {
	private readonly _genesisTime: Date;
	private readonly _interval: number;

	public constructor({ genesisTime, interval }: SlotsInput) {
		this._genesisTime = new Date(genesisTime * SEC_IN_MS);
		this._interval = interval;
	}

	public timeSinceGenesis(): number {
		return Math.floor((Date.now() - this._genesisTime.getTime()) / SEC_IN_MS);
	}

	public blockTime(): number {
		return this._interval;
	}

	public getRealTime(time: number): number {
		return (
			Math.floor(this._genesisTime.getTime() / SEC_IN_MS) * SEC_IN_MS +
			time * SEC_IN_MS
		);
	}

	public getSlotNumber(timeStamp?: number): number {
		const elapsedTime = Math.floor(
			((timeStamp ? timeStamp * SEC_IN_MS : Date.now()) -
				this._genesisTime.getTime()) /
				SEC_IN_MS,
		);

		return Math.floor(elapsedTime / this._interval);
	}

	public getSlotTime(slot: number): number {
		return slot * this._interval;
	}

	public getNextSlot(): number {
		const slot = this.getSlotNumber();

		return slot + 1;
	}

	public isWithinTimeslot(slot: number, time?: number): boolean {
		return this.getSlotNumber(time) === slot;
	}
}
