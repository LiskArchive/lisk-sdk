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
 *
 */
import { address as cryptoAddress } from '@liskhq/lisk-cryptography';
import {
	isHexString,
	isBytes,
	isIP,
	isIPV4,
	isEncryptedPassphrase,
	isSemVer,
	isNumberString,
	isUInt64,
	isSInt64,
} from './validation';
import { MAX_UINT32 } from './constants';

export const hex = isHexString;
export const bytes = isBytes;

// uint64 and int64 are always type string, while uint32 and int32 are type integer
export const int64 = (data: string): boolean => isNumberString(data) && isSInt64(BigInt(data));

export const uint64 = (data: string): boolean => isNumberString(data) && isUInt64(BigInt(data));

// int32 is appropriately defined in ajv-format plugin, no need to create a custom format
export const uint32 = {
	type: 'number',
	validate: (value: number) => Number.isInteger(value) && value >= 0 && value <= MAX_UINT32,
};

const camelCaseRegex = /^[a-z][0-9]*([A-Z][a-z]*[a-zA-Z0-9]*|[a-z][a-z]*[a-zA-Z0-9]*)?$/;

export const camelCase = (data: string): boolean => camelCaseRegex.exec(data) !== null;

export const version = isSemVer;

export const networkVersion = (data: string): boolean =>
	/^(\d|[1-9]\d{1,2})\.(\d|[1-9]\d{1,2})$/.test(data);

export const path = (data: string): boolean => /^(.?)(\/[^/]+)+(\/?)$/.test(data);

export const encryptedPassphrase = isEncryptedPassphrase;

export const ip = isIP;

export const ipOrFQDN = (data: string): boolean => {
	const hostnameRegex =
		/^[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?(\.[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?)*$/;
	return isIPV4(data) || hostnameRegex.test(data);
};

export const oddInteger = (data: string | number): boolean => {
	if (typeof data === 'number') {
		return Number.isInteger(data) && data % 2 === 1;
	}
	return /^\d*[13579]$/.test(data);
};

export const lisk32 = (data: string): boolean => {
	try {
		cryptoAddress.validateLisk32Address(data);
		return true;
	} catch (error) {
		return false;
	}
};
