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

import { BaseForgingCommand } from '../base_forging';

export abstract class DisableCommand extends BaseForgingCommand {
	static description = 'Disable forging for given validator address.';

	static examples = [
		'generator:disable lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz',
		'generator:disable lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz --data-path ./data',
		'generator:disable lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz --data-path ./data --password your_password',
	];

	static flags = {
		...BaseForgingCommand.flags,
	};

	static args = [...BaseForgingCommand.args];

	async init(): Promise<void> {
		await super.init();
		this.forging = false;
	}
}
