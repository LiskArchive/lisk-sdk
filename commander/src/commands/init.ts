/*
 * LiskHQ/lisk-commander
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

import { Command } from '@oclif/command';
import { env } from '../generators';

export default class InitCommand extends Command {
	// eslint-disable-next-line class-methods-use-this
	async run(): Promise<void> {
		return new Promise((resolve, reject) => {
			env.run('lisk:init', (err): void => {
				if (err) {
					console.error(err);
					return reject(err);
				}

				return resolve();
			});
		});
	}
}
