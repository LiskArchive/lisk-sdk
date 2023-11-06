/* eslint-disable no-bitwise */

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
import { SchemaProps } from '../types';
import { writeUInt32 } from '../varint';

export const getWireType = (schemaProp: SchemaProps) => {
	const dataType = schemaProp.dataType ?? schemaProp.type;

	switch (dataType) {
		case 'bytes':
		case 'string':
		case 'object':
		case 'array':
			return 2;
		default:
			return 0;
	}
};

export const generateKey = (schemaProp: SchemaProps): Buffer => {
	const wireType = getWireType(schemaProp);
	const keyAsVarInt = writeUInt32((schemaProp.fieldNumber << 3) | wireType);

	return keyAsVarInt;
};
