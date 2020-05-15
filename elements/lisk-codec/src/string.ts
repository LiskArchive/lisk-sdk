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
import { writeVarInt } from './varint';

interface SchemaProperty {
	readonly dataType: string;
}

export const writeString = (value: string, _schema: SchemaProperty): Buffer => {
	const stringBuffer = Buffer.from(value, 'utf8');

	return Buffer.concat([
		writeVarInt(stringBuffer.length, { dataType: 'uint32' }),
		stringBuffer,
	]);
};

export const readString = (buffer: Buffer, _schema: SchemaProperty): string =>
	buffer.toString('utf8', 1, buffer.length);
