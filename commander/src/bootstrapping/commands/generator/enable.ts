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

export abstract class EnableCommand extends BaseForgingCommand {
	static description = 'Enable forging for given delegate address.';

	static examples = [
		'generator:enable lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu 100 100 10',
		'generator:enable lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu 100 100 10 --overwrite',
		'generator:enable lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu 100 100 10 --data-path ./data',
		'generator:enable lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu 100 100 10 --data-path ./data --password your_password',
	];

	static flags = {
		...BaseForgingCommand.flags,
	};

	static args = [
		...BaseForgingCommand.args,
		{
			name: 'height',
			required: true,
			description: 'Last forged block height.',
		},
		{
			name: 'maxHeightPreviouslyForged',
			required: true,
			description: 'Delegates largest previously forged height.',
		},
		{
			name: 'maxHeightPrevoted',
			required: true,
			description: 'Delegates largest prevoted height for a block.',
		},
	];

	async init(): Promise<void> {
		await super.init();
		this.forging = true;
	}
}
