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
	readonly epochTime: string;
	readonly interval: number;
}

const SEC_IN_MS = 1000;

export class Slots {
	private readonly _epochTime: Date;
	private readonly _interval: number;

	public constructor({ epochTime, interval }: SlotsInput) {
		this._epochTime = new Date(epochTime);
		this._interval = interval;
	}

	public getEpochTime(): number {
		return Math.floor((Date.now() - this._epochTime.getTime()) / SEC_IN_MS);
	}

	public getRealTime(time: number): number {
		return (
			Math.floor(this._epochTime.getTime() / SEC_IN_MS) * SEC_IN_MS +
			time * SEC_IN_MS
		);
	}

	public getSlotNumber(epochTime?: number): number {
		const parsedEpochTime =
			epochTime === undefined ? this.getEpochTime() : epochTime;

		return Math.floor(parsedEpochTime / this._interval);
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
