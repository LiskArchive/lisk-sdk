/*
 * Copyright © 2020 Lisk Foundation
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

import { pathExistsSync, readFileSync } from 'fs-extra';
import { getPidPath } from './path';

interface ErrorWithCode extends Error {
	readonly code?: string;
}

export const getPid = (dataPath: string): number =>
	parseInt(readFileSync(getPidPath(dataPath), { encoding: 'utf8' }), 10);

export const isApplicationRunning = (dataPath: string): boolean => {
	const pidPath = getPidPath(dataPath);

	if (!pathExistsSync(pidPath)) {
		return false;
	}

	const pid = getPid(dataPath);

	try {
		process.kill(pid, 0);
	} catch (e) {
		if ((e as ErrorWithCode).code) {
			return (e as ErrorWithCode).code === 'EPERM';
		}

		return false;
	}

	return true;
};
