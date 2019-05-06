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
 */

'use strict';

import childProcess from 'child_process';
import fs from 'fs';

const getLastCommitIdFromGit = (): string => {
	let lastCommitId = '';
	try {
		// .toString() converts Buffer to String, .trim() removes eol character
		lastCommitId = childProcess
			.execSync('git rev-parse HEAD')
			.toString()
			.trim();
	} catch (error) {
		// tslint:disable-next-line no-console
		console.log(
			'When getting git rev-parse HEAD, following error happened',
			error.toString()
		);
	}

	return lastCommitId;
};

const getLastCommitIdFromRevisionFile = (): string => {
	// REVISION file is being created in the root folder during build process.
	try {
		return fs
			.readFileSync('REVISION')
			.toString()
			.trim();
	} catch (error) {
		throw new Error('REVISION file found.');
	}
};

/**
 * Returns hash of the last git commit if available.
 *
 * @throws {Error} If cannot get last git commit
 */
const getLastCommitId = (): string => {
	let lastCommitId = getLastCommitIdFromGit();
	if (!lastCommitId) {
		lastCommitId = getLastCommitIdFromRevisionFile();
	}

	return lastCommitId;
};

export { getLastCommitId };
