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
import config from '../utils/env';

const description = `Print environmental configuration.

	Example: env
`;

const env = vorpal => () => Promise.resolve(vorpal.activeCommand.log(JSON.stringify(config, null, '\t')));

export default function envCommand(vorpal) {
	vorpal
		.command('env')
		.description(description)
		.action(env(vorpal));
}
