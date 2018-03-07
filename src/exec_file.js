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
import fs from 'fs';
import childProcess from 'child_process';

const handleError = (lisky, error) =>
	lisky.log(error.trim ? error.trim() : error);

const DIST_PATH = `${__dirname}/../dist`;

const generateScript = commandWithOptions => `
	process.env.NON_INTERACTIVE_MODE = true;
	process.env.EXEC_FILE_CHILD = true;
	var lisky = require('${DIST_PATH}').default;

	function handleSuccess() { process.exit(0) }
	function handleError() { process.exit(1) }

	lisky
		.exec('${commandWithOptions.join(' ')}')
		.then(handleSuccess, handleError)
`;

const executeCommand = (lisky, commands, options) => {
	const optionsToUse = Array.isArray(options) ? options : [];
	const commandWithOptions = [commands[0], ...optionsToUse];
	const script = generateScript(commandWithOptions);

	return new Promise((resolve, reject) => {
		childProcess.exec(`node --eval "${script}"`, (error, stdout, stderr) => {
			if (error) return reject(handleError(lisky, error));
			if (stderr) return reject(handleError(lisky, stderr));

			lisky.log(stdout.trim());

			const remainingCommands = commands.slice(1);
			return remainingCommands.length
				? executeCommand(lisky, remainingCommands, options).then(
						resolve,
						reject,
					)
				: resolve();
		});
	});
};

const execFile = (lisky, path, options, exit) => {
	const fileContents = fs.readFileSync(path, 'utf8');
	const commands = fileContents
		.split('\n')
		.filter(Boolean)
		.filter(line => !line.match(/^[\s]*#/));

	return executeCommand(lisky, commands, options).then(
		() => exit(0),
		() => exit(1),
	);
};

export default execFile;
