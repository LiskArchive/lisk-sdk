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
import config from './config';
import { shouldUseJsonOutput, shouldUsePrettyOutput } from './helpers';
import tablify from './tablify';

// eslint-disable-next-line import/prefer-default-export
export const printResult = (vorpal, options = {}) => (result) => {
	const useJsonOutput = shouldUseJsonOutput(config, options);
	const prettifyOutput = shouldUsePrettyOutput(config, options);

	const output = useJsonOutput
		? JSON.stringify(result, null, prettifyOutput ? '\t' : null)
		: tablify(result).toString();

	vorpal.activeCommand.log(output);
	return result;
};
