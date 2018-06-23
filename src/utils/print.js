/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import stripANSI from 'strip-ansi';
import tablify from './tablify';

const removeANSIFromObject = object =>
	Object.entries(object).reduce(
		(strippedResult, [key, value]) =>
			Object.assign({}, strippedResult, { [key]: stripANSI(value) }),
		{},
	);

const removeANSI = result =>
	Array.isArray(result)
		? result.map(removeANSIFromObject)
		: removeANSIFromObject(result);

const print = ({ json, pretty }) =>
	function printResult(result) {
		const resultToPrint = json ? removeANSI(result) : result;

		const output = json
			? JSON.stringify(resultToPrint, null, pretty ? '\t' : null)
			: tablify(resultToPrint).toString();

		const logger = this && this.log ? this : console;
		logger.log(output);
	};

export default print;
