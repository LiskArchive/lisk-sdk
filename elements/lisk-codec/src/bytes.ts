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
import { writeUInt32, readUInt32 } from './varint';

export const writeBytes = (bytes: Buffer): Buffer =>
	Buffer.concat([writeUInt32(bytes.length), bytes]);

export const readBytes = (buffer: Buffer, offset: number): [Buffer, number] => {
	const [byteLength, keySize] = readUInt32(buffer, offset);
	return [buffer.subarray(offset + keySize, offset + keySize + byteLength), byteLength + keySize];
};
