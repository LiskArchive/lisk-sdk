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
import 'babel-polyfill';
import fs from 'fs';
import path from 'path';
import vorpal from 'vorpal';
import { version } from '../package.json';
import config from './utils/env';

const lisky = vorpal();

const commandsDir = path.join(__dirname, 'commands');

fs.readdirSync(commandsDir).forEach((command) => {
	const commandPath = path.join(commandsDir, command);
	// eslint-disable-next-line global-require, import/no-dynamic-require
	const commandModule = require(commandPath);
	lisky.use(commandModule.default);
});

const logo = `
 _ _     _
| (_)___| | ___   _
| | / __| |/ / | | |
| | \\__ \\   <| |_| |
|_|_|___/_|\\_\\\\__, |
              |___/
`;

const message = `
Running v${version}. Copyright (C) 2017 Lisk Foundation
Type \`help\` to get started.
`;
const intro = `${logo}${message}`;

lisky
	.delimiter('lisky>')
	.history('lisky');

if (process.env.NON_INTERACTIVE_MODE !== 'true') {
	lisky.log(intro).show();
}

lisky.find('help').alias('?');
lisky.find('exit').description(`Exits ${config.name}.`);

export default lisky;
