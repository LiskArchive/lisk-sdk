/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import config from './config';
import { shouldUseJSONOutput, shouldUsePrettyOutput } from './helpers';
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

const print = (vorpal, options = {}) =>
	function printResult(result) {
		const useJSONOutput = shouldUseJSONOutput(config, options);
		const prettifyOutput = shouldUsePrettyOutput(config, options);
		const resultToPrint = useJSONOutput ? removeANSI(result) : result;

		const output = useJSONOutput
			? JSON.stringify(resultToPrint, null, prettifyOutput ? '\t' : null)
			: tablify(resultToPrint).toString();

		const logger = this && this.log ? this : vorpal;
		logger.log(output);
	};

export default print;
