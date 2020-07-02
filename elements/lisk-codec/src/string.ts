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
import { readBytes, writeBytes } from './bytes';

export const writeString = (value: string): Buffer => {
	const stringBuffer = Buffer.from(value, 'utf8');

	return writeBytes(stringBuffer);
};

export const readString = (
	buffer: Buffer,
	offset: number,
): [string, number] => {
	const [value, size] = readBytes(buffer, offset);
	return [value.toString('utf8'), size];
};
