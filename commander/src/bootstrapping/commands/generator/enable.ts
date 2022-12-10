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

import { Flags } from '@oclif/core';
import { BaseGeneratorCommand } from '../base_generator';

interface Status {
	readonly address: string;
	readonly height: number;
	readonly maxHeightGenerated: number;
	readonly maxHeightPrevoted: number;
}

export abstract class EnableCommand extends BaseGeneratorCommand {
	static description = 'Enable block generation for given validator address.';

	static examples = [
		'generator:enable lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu --use-status-value',
		'generator:enable lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu --height=100 --max-height-generated=30 --max-height-prevoted=10',
		'generator:enable lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu --height=100 --max-height-generated=30 --max-height-prevoted=10 --data-path ./data',
		'generator:enable lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu --height=100 --max-height-generated=30 --max-height-prevoted=10 --data-path ./data --password your_password',
	];

	static flags = {
		...BaseGeneratorCommand.flags,
		height: Flags.integer({
			description: 'Last generated block height.',
			exclusive: ['use-status-value'],
			dependsOn: ['max-height-generated', 'max-height-prevoted'],
			min: 0,
		}),
		'max-height-generated': Flags.integer({
			description: "Validator's largest previously generated height.",
			exclusive: ['use-status-value'],
			dependsOn: ['height', 'max-height-prevoted'],
			min: 0,
		}),
		'max-height-prevoted': Flags.integer({
			description: "Validator's largest prevoted height for a block.",
			exclusive: ['use-status-value'],
			dependsOn: ['max-height-generated', 'height'],
			min: 0,
		}),
		'use-status-value': Flags.boolean({
			description: 'Use status value from the connected node',
			exclusive: ['height', 'max-height-generated', 'max-height-prevoted'],
		}),
	};

	static args = [...BaseGeneratorCommand.args];

	async run(): Promise<void> {
		const { args, flags } = await this.parse(EnableCommand);
		const { address } = args as { address: string };
		const { 'use-status-value': useStatusValue } = flags;

		let {
			height,
			'max-height-generated': maxHeightGenerated,
			'max-height-prevoted': maxHeightPrevoted,
		} = flags;

		if (!useStatusValue && height === undefined) {
			throw new Error('--use-status-value flag or heights flags must be specified.');
		}

		const password = await this.getPassword(flags);

		if (!this._client) {
			this.error('APIClient is not initialized.');
		}

		if (useStatusValue) {
			const statusList = await this._client.invoke<{ status: Status[] }>('generator_getStatus');
			const foundStatus = statusList.status.find(s => s.address === address);
			if (!foundStatus) {
				throw new Error(`Status for ${address} not found in the node.`);
			}
			height = foundStatus.height;
			maxHeightGenerated = foundStatus.maxHeightGenerated;
			maxHeightPrevoted = foundStatus.maxHeightPrevoted;
		}

		await this._client.invoke('generator_updateStatus', {
			address,
			password,
			enable: true,
			height: Number(height ?? 0),
			maxHeightGenerated: Number(maxHeightGenerated ?? 0),
			maxHeightPrevoted: Number(maxHeightPrevoted ?? 0),
		});
		this.log(`Enabled block generation for ${address}`);
	}
}
