/*
 * LiskHQ/lisk-commander
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
import chalk from 'chalk';
import vorpal from 'vorpal';
import { version } from '../package.json';
import { getConfig } from './utils/config';

const name = getConfig().name || 'lisk-commander';
const liskCommander = vorpal();

const commandsDir = path.join(__dirname, 'commands');

fs.readdirSync(commandsDir).forEach(command => {
	const commandPath = path.join(commandsDir, command);
	// eslint-disable-next-line global-require, import/no-dynamic-require
	const commandModule = require(commandPath);
	liskCommander.use(commandModule.default);
});

const copyright = chalk.dim(`Lisk Commander  Copyright (C) 2016–2018  Lisk Foundation
This program comes with ABSOLUTELY NO WARRANTY; for details type \`show w\`.
This is free software, and you are welcome to redistribute it under certain conditions; type \`show c\` for details.
`);

const logo = chalk.rgb(36, 117, 185)(`
 _      _     _       _____                                          _
| |    (_)   | |     / ____|                                        | |
| |     _ ___| | __ | |     ___  _ __ ___  _ __ ___   __ _ _ __   __| | ___ _ __
| |    | / __| |/ / | |    / _ \\| '_ \` _ \\| '_ \` _ \\ / _\` | '_ \\ / _\` |/ _ \\ '__|
| |____| \\__ \\   <  | |___| (_) | | | | | | | | | | | (_| | | | | (_| |  __/ |
|______|_|___/_|\\_\\  \\_____\\___/|_| |_| |_|_| |_| |_|\\__,_|_| |_|\\__,_|\\___|_|
`);

const message = `
Running v${version}.
Type \`help\` to get started.
`;
const intro = `${copyright}${logo}${message}`;

liskCommander.delimiter(`${name}>`).history(name);

if (process.env.NON_INTERACTIVE_MODE !== 'true') {
	liskCommander.log(intro).show();
}

liskCommander.find('help').alias('?');
liskCommander.find('exit').description(`Exits ${name}.`);

export default liskCommander;
