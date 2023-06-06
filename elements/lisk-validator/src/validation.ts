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
import {
	gte as isVersionGte,
	gtr as isGreaterThanVersionInRange,
	ltr as isLessThanVersionInRange,
	valid as isValidVersion,
	validRange as isValidRangeVersion,
} from 'semver';
import validator from 'validator';

import {
	MAX_SINT32,
	MAX_SINT64,
	MAX_UINT32,
	MAX_UINT64,
	MIN_SINT32,
	MIN_SINT64,
} from './constants';

export const isNumberString = (num: unknown): boolean => {
	if (typeof num !== 'string') {
		return false;
	}

	return validator.isInt(num);
};

export const isString = (data: unknown): boolean => typeof data === 'string';

export const isBoolean = (data: unknown): boolean => typeof data === 'boolean';

export const isSInt32 = (data: unknown): boolean => {
	if (typeof data === 'number' && Number.isInteger(data)) {
		return data <= MAX_SINT32 && data >= MIN_SINT32;
	}

	return false;
};

export const isUInt32 = (data: unknown): boolean => {
	if (typeof data === 'number' && Number.isInteger(data)) {
		return data <= MAX_UINT32 && data >= 0;
	}

	return false;
};

export const isSInt64 = (data: unknown): boolean =>
	typeof data === 'bigint' ? data <= MAX_SINT64 && data >= MIN_SINT64 : false;

export const isUInt64 = (data: unknown): boolean =>
	typeof data === 'bigint' ? data <= MAX_UINT64 && data >= BigInt(0) : false;

export const isBytes = (data: unknown): boolean => Buffer.isBuffer(data);

export const isValidInteger = (num: unknown): boolean =>
	typeof num === 'number' ? Math.floor(num) === num : false;

export const isHexString = (data: unknown): boolean => {
	if (typeof data !== 'string') {
		return false;
	}

	return data === '' || /^([0-9a-f]{2})+$/i.test(data);
};

export const isEncryptedPassphrase = (data: string): boolean => {
	// Explanation of regex structure:
	// - 1 or more 'key=value' pairs delimited with '&'
	// Examples:
	// - cipherText=abcd1234
	// - cipherText=abcd1234&iterations=10000&iv=ef012345
	// NOTE: Maximum lengths chosen here are arbitrary
	const keyRegExp = /[a-zA-Z0-9]{2,15}/;
	const valueRegExp = /[a-z0-9+-]{1,512}/;
	const keyValueRegExp = new RegExp(`${keyRegExp.source}=${valueRegExp.source}`);
	const encryptedPassphraseRegExp = new RegExp(
		`^(${keyValueRegExp.source})(?:&(${keyValueRegExp.source})){0,10}$`,
	);

	return encryptedPassphraseRegExp.test(data);
};

export const isSemVer = (version: string): boolean => !!isValidVersion(version);

export const isRangedSemVer = (version: string): boolean => !!isValidRangeVersion(version);

export const isLessThanRangedVersion = isLessThanVersionInRange;
export const isGreaterThanRangedVersion = isGreaterThanVersionInRange;

export const isProtocolString = (data: string): boolean =>
	/^(\d|[1-9]\d{1,2})\.(\d|[1-9]\d{1,2})$/.test(data);

const IPV4_NUMBER = '4';
const IPV6_NUMBER = '6';

export const isIPV4 = (data: string): boolean => validator.isIP(data, IPV4_NUMBER);

export const isIPV6 = (data: string): boolean => validator.isIP(data, IPV6_NUMBER);

export const isIP = (data: string): boolean => isIPV4(data) || isIPV6(data);

export const isPort = (port: string): boolean => validator.isPort(port);

export const isStringEndsWith = (target: string, suffixes: ReadonlyArray<string>): boolean =>
	suffixes.some(suffix => target.endsWith(suffix));

export const isVersionMatch = isVersionGte;

export const isCsv = (data: string): boolean => {
	if (typeof data !== 'string') {
		return false;
	}

	const csvAsArray = data.split(',');

	if (csvAsArray.length > 0) {
		return true;
	}

	return false;
};
