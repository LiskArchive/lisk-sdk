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
import fs from 'fs';
import childProcess from 'child_process';

const handleError = (liskCommander, error) =>
	liskCommander.log(error.trim ? error.trim() : error);

const DIST_PATH = `${__dirname}/../dist`;

const generateScript = commandWithOptions => `
	process.env.NON_INTERACTIVE_MODE = true;
	process.env.EXEC_FILE_CHILD = true;
	var liskCommander = require('${DIST_PATH}').default;

	function handleSuccess() { process.exit(0) }
	function handleError() { process.exit(1) }

	liskCommander
		.exec('${commandWithOptions.join(' ')}')
		.then(handleSuccess, handleError)
`;

const executeCommand = (liskCommander, commands, options) => {
	const optionsToUse = Array.isArray(options) ? options : [];
	const commandWithOptions = [commands[0], ...optionsToUse];
	const script = generateScript(commandWithOptions);

	return new Promise((resolve, reject) => {
		childProcess.exec(`node --eval "${script}"`, (error, stdout, stderr) => {
			if (error) return reject(handleError(liskCommander, error));
			if (stderr) return reject(handleError(liskCommander, stderr));

			liskCommander.log(stdout.trim());

			const remainingCommands = commands.slice(1);
			return remainingCommands.length
				? executeCommand(liskCommander, remainingCommands, options).then(
						resolve,
						reject,
					)
				: resolve();
		});
	});
};

const execFile = (liskCommander, path, options, exit) => {
	const fileContents = fs.readFileSync(path, 'utf8');
	const commands = fileContents
		.split('\n')
		.filter(Boolean)
		.filter(line => !line.match(/^[\s]*#/));

	return executeCommand(liskCommander, commands, options).then(
		() => exit(0),
		() => exit(1),
	);
};

export default execFile;
