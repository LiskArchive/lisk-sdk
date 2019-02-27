import { Block } from './type';

interface SlotOption {
	readonly epochTime: number;
	readonly slotInterval: number;
}

const MS = 1000;

const nowInSecond = (): number => Date.now() / MS;

export class Slot {
	private readonly _epochTime: number;
	private readonly _slotInterval: number;

	public constructor({ epochTime, slotInterval }: SlotOption) {
		this._epochTime = epochTime;
		this._slotInterval = slotInterval;
	}

	public slotNumber(time?: number): number {
		const referenceTime = time ? time : this._getTime();

		return Math.floor(referenceTime / this._slotInterval);
	}

	private _getTime(): number {
		return Math.floor(nowInSecond() - this._epochTime);
	}
}

export const validateBlockSlotWindow = (
	block: Block,
	slot: Slot,
	slotWindow: number,
): Error | undefined => {
	const currentSlot = slot.slotNumber();
	const blockSlot = slot.slotNumber(block.timestamp);
	if (currentSlot - blockSlot > slotWindow) {
		return new Error('Block is too old');
	}
	if (currentSlot < blockSlot) {
		return new Error('Block is in the future');
	}

	return undefined;
};

export const validateBlockSlot = (
	block: Block,
	lastBlock: Block,
	slot: Slot,
): Error | undefined => {
	const blockSlot = slot.slotNumber(block.timestamp);
	const lastBlockSlot = slot.slotNumber(lastBlock.timestamp);
	if (blockSlot > slot.slotNumber() || blockSlot <= lastBlockSlot) {
		return new Error('Invalid block slot');
	}

	return undefined;
};
