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

import BaseBootstrapCommand from '../base_bootstrap_command';
import { env } from '../generators/env';

export default class InitCommand extends BaseBootstrapCommand {
	static flags = {
		...BaseBootstrapCommand.flags,
	};

	async run(): Promise<void> {
		return new Promise((resolve, reject) => {
			env.run(
				'lisk:init',
				// TODO: Pass the commander version
				{ template: this.bootstrapFlags.template, version: '0.1.0' },
				(err): void => {
					if (err) {
						console.error(err);
						return reject(err);
					}

					return resolve();
				},
			);
		});
	}
}
