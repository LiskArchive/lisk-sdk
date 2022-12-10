/*
 * Copyright © 2021 Lisk Foundation
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

import { BaseGeneratorCommand } from '../base_generator';

export abstract class DisableCommand extends BaseGeneratorCommand {
	static description = 'Disable block generation for given validator address.';

	static examples = [
		'generator:disable lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz',
		'generator:disable lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz --data-path ./data',
		'generator:disable lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz --data-path ./data --password your_password',
	];

	static flags = {
		...BaseGeneratorCommand.flags,
	};

	static args = [...BaseGeneratorCommand.args];

	async run(): Promise<void> {
		const { args, flags } = await this.parse(DisableCommand);
		const { address } = args as { address: string };

		const password = await this.getPassword(flags);

		if (!this._client) {
			this.error('APIClient is not initialized.');
		}

		await this._client.invoke('generator_updateStatus', {
			address,
			password,
			enable: false,
			height: 0,
			maxHeightGenerated: 0,
			maxHeightPrevoted: 0,
		});
		this.log(`Disabled block generation for ${address}`);
	}
}
