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
/* eslint-disable no-bitwise */
/* eslint-disable no-param-reassign */

import { MAX_SINT32, MAX_SINT64, MAX_UINT32, MAX_UINT64 } from '@liskhq/lisk-validator';

const msg = 0x80;
const rest = 0x7f;

export const writeUInt32 = (value: number): Buffer => {
	if (value > MAX_UINT32) {
		throw new Error('Value out of range of uint32');
	}

	const result: number[] = [];
	let index = 0;
	while (value > rest) {
		result[index] = msg | ((value & rest) >>> 0);
		value = (value >>> 7) >>> 0;
		index += 1;
	}

	result[index] = value;

	return Buffer.from(result);
};

export const writeSInt32 = (value: number): Buffer => {
	if (value > MAX_SINT32) {
		throw new Error('Value out of range of sint32');
	}

	if (value >= 0) {
		return writeUInt32(2 * value);
	}
	return writeUInt32(-2 * value - 1);
};

export const writeUInt64 = (value: bigint): Buffer => {
	if (value > MAX_UINT64) {
		throw new Error('Value out of range of uint64');
	}

	const result: number[] = [];
	let index = 0;
	while (value > BigInt(rest)) {
		result[index] = Number(BigInt(msg) | (value & BigInt(rest)));
		value >>= BigInt(7);
		index += 1;
	}

	result[Number(index)] = Number(value);

	return Buffer.from(result);
};

export const writeSInt64 = (value: bigint): Buffer => {
	if (value > MAX_SINT64) {
		throw new Error('Value out of range of sint64');
	}

	if (value >= BigInt(0)) {
		return writeUInt64(BigInt(2) * value);
	}
	return writeUInt64(BigInt(-2) * value - BigInt(1));
};

export const readUInt32 = (buffer: Buffer, offset: number): [number, number] => {
	let result = 0;
	let index = offset;
	for (let shift = 0; shift < 32; shift += 7) {
		if (index >= buffer.length) {
			throw new Error('Invalid buffer length');
		}
		const bit = buffer[index];
		index += 1;
		if (index === offset + 5 && bit > 0x0f) {
			throw new Error('Value out of range of uint32');
		}
		result = (result | ((bit & rest) << shift)) >>> 0;
		if ((bit & msg) === 0) {
			validateVarintSize(BigInt(result), index - offset);
			return [result, index - offset];
		}
	}
	throw new Error('Terminating bit not found');
};

export const readUInt64 = (buffer: Buffer, offset: number): [bigint, number] => {
	let result = BigInt(0);
	let index = offset;
	for (let shift = BigInt(0); shift < BigInt(64); shift += BigInt(7)) {
		if (index >= buffer.length) {
			throw new Error('Invalid buffer length');
		}
		const bit = BigInt(buffer[index]);
		index += 1;
		if (index === 10 + offset && bit > 0x01) {
			throw new Error('Value out of range of uint64');
		}
		result |= (bit & BigInt(rest)) << shift;
		if ((bit & BigInt(msg)) === BigInt(0)) {
			validateVarintSize(result, index - offset);
			return [result, index - offset];
		}
	}
	throw new Error('Terminating bit not found');
};

export const readSInt32 = (buffer: Buffer, offset: number): [number, number] => {
	const [varInt, size] = readUInt32(buffer, offset);
	if (varInt % 2 === 0) {
		return [varInt / 2, size];
	}
	return [-(varInt + 1) / 2, size];
};

export const readSInt64 = (buffer: Buffer, offset: number): [bigint, number] => {
	const [varInt, size] = readUInt64(buffer, offset);
	if (varInt % BigInt(2) === BigInt(0)) {
		return [varInt / BigInt(2), size];
	}
	return [-(varInt + BigInt(1)) / BigInt(2), size];
};

const validateVarintSize = (result: bigint, size: number) => {
	// when result is 0, size must be 1, but the below condition only supports result greater than 1.
	if (result === BigInt(0) && size === 1) {
		return;
	}

	const min = BigInt(1) << BigInt(7 * (size - 1));
	if (result < min) {
		throw new Error('invalid varint bytes. vartint must be in shortest form.');
	}
};
