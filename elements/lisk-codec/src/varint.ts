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

const msg = 0x80;
const rest = 0x7f;

type int = bigint | number;

const isNumber = (val: int): val is number => typeof val === 'number';

interface SchemaProperty {
	readonly dataType: string;
}

const writeVarIntNumber = (value: number): Buffer => {
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

const writeVarIntBigInt = (value: bigint): Buffer => {
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

export const writeVarInt = (value: int, _schema: SchemaProperty): Buffer =>
	isNumber(value) ? writeVarIntNumber(value) : writeVarIntBigInt(value);

export const writeSignedVarInt = (
	value: int,
	schema: SchemaProperty,
): Buffer => {
	if (schema.dataType === 'sint32') {
		const number = Number(value);
		if (number >= 0) {
			return writeVarIntNumber(2 * number);
		}
		return writeVarIntNumber(-2 * number - 1);
	}
	const number = BigInt(value);
	if (number >= BigInt(0)) {
		return writeVarInt(BigInt(2) * number, schema);
	}
	return writeVarInt(BigInt(-2) * number - BigInt(1), schema);
};

const readVarIntNumber = (buffer: Buffer): number => {
	let result = 0;
	let index = 0;
	for (let shift = 0; shift < 32; shift += 7) {
		if (index >= buffer.length) {
			throw new Error('Invalid buffer length');
		}
		const bit = buffer[index];
		index += 1;
		if (index === 5 && bit > 0x0f) {
			throw new Error('Value out of range of uint32');
		}
		result = (result | ((bit & rest) << shift)) >>> 0;
		if ((bit & msg) === 0) {
			return result;
		}
	}
	throw new Error('Terminating bit not found');
};

const readVarIntBigInt = (buffer: Buffer): bigint => {
	let result = BigInt(0);
	let index = 0;
	for (let shift = BigInt(0); shift < BigInt(64); shift += BigInt(7)) {
		if (index >= buffer.length) {
			throw new Error('Invalid buffer length');
		}
		const bit = BigInt(buffer[index]);
		index += 1;
		if (index === 10 && bit > 0x01) {
			throw new Error('Value out of range of uint64');
		}
		result |= (bit & BigInt(rest)) << shift;
		if ((bit & BigInt(msg)) === BigInt(0)) {
			return result;
		}
	}
	throw new Error('Terminating bit not found');
};

export const readVarInt = (buffer: Buffer, schema: SchemaProperty): int =>
	schema.dataType === 'uint32' || schema.dataType === 'sint32'
		? readVarIntNumber(buffer)
		: readVarIntBigInt(buffer);

const readSignedVarIntNumber = (buffer: Buffer): number => {
	const varInt = readVarIntNumber(buffer);
	if (varInt % 2 === 0) {
		return varInt / 2;
	}
	return -(varInt + 1) / 2;
};

const readSignedVarIntBigInt = (buffer: Buffer): bigint => {
	const varInt = readVarIntBigInt(buffer);
	if (varInt % BigInt(2) === BigInt(0)) {
		return varInt / BigInt(2);
	}
	return -(varInt + BigInt(1)) / BigInt(2);
};

export const readSignedVarInt = (buffer: Buffer, schema: SchemaProperty): int =>
	schema.dataType === 'sint32'
		? readSignedVarIntNumber(buffer)
		: readSignedVarIntBigInt(buffer);
