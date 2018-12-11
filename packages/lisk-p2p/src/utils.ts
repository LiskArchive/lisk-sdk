/*
 * Copyright © 2018 Lisk Foundation
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
const IP_NUMBER_OF_BLOCKS = 4;
const IP_MAX_VAL_PER_BLOCK = 256;
const MAX_VAL_PORT = 65535;
const MIN_VAL_PORT = 1;

export const validateIp = (ipAddress: string): boolean => {
	const ipAddressSplit = ipAddress.split('.');

	if (ipAddressSplit.length !== IP_NUMBER_OF_BLOCKS) {
		return false;
	}

	/* tslint:disable:next-line: no-let */
	let isValid = true;
	const reg = new RegExp('^[0-9]+$');

	ipAddressSplit.forEach(block => {
		if (
			reg.test(block) &&
			parseInt(block, 10) >= 0 &&
			parseInt(block, 10) < IP_MAX_VAL_PER_BLOCK
		) {
			return;
		}
		isValid = false;
	});

	return isValid;
};

export const validatePort = (port: string | number): boolean => {
	const portInt = +port;

	return (
		portInt >= MIN_VAL_PORT &&
		portInt <= MAX_VAL_PORT &&
		port === portInt.toString()
	);
};

export const onlyDigits = (input: string | number): boolean => {
	const inputInteger = +input;

	return input === inputInteger.toString();
};
