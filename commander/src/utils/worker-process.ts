/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import childProcess from 'child_process';
import fsExtra from 'fs-extra';
import { defaultLiskInstancePath } from './core/config';

export interface ExecResult {
	readonly stderr: string;
	readonly stdout: string;
}

export const exec = async (
	command: string,
	options: childProcess.ExecOptions = {},
): Promise<ExecResult> =>
	new Promise(resolve => {
		childProcess.exec(command, options, (error, stdout, stderr) => {
			if (error || stderr) {
				fsExtra.writeJSONSync(`${defaultLiskInstancePath}/error.log`, {
					error,
					stderr,
				});
			}

			// To resolve the error gracefully, only resolving and not rejecting
			// While using exec make sure you handle the error
			// As it will never reject, rather return {stdout, stderr}
			resolve({ stdout, stderr: (error as unknown) as string });
		});
	});
