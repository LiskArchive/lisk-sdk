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
import Vorpal from 'vorpal';

export const setUpVorpalWithCommand = (command, capturedOutput) => {
	const handleOutput = output => capturedOutput.push(output);
	const vorpal = new Vorpal();

	vorpal.use(command);
	vorpal.pipe((outputs) => {
		if (capturedOutput) {
			outputs.forEach(handleOutput);
		}
		return '';
	});
	return vorpal;
};

// eslint-disable-next-line no-underscore-dangle
export const createCommandFilter = commandName => command => command._name === commandName;

export const getCommands = (vorpal, commandName) =>
	vorpal.commands.filter(createCommandFilter(commandName));

export const requiredArgsFilter = arg => arg.required;

export const getRequiredArgs = (vorpal, commandName) =>
// eslint-disable-next-line no-underscore-dangle
	getCommands(vorpal, commandName)[0]._args.filter(requiredArgsFilter);
