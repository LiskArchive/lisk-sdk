/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import BaseCommand from '../../../base';
import InstallCommand from '../install';

const { snapshotUrl, releaseUrl, ...startFlags } = InstallCommand.flags;

export default class StartCommand extends BaseCommand {
	static description = 'Start Lisk Core';

	static examples = [
		'node:start',
		'node:start --no-snapshot',
		'node:start --network=testnet',
		'node:start --installation-path=/opt/lisk/lisk-testnet --network=testnet',
	];

	static flags = {
		...BaseCommand.flags,
		...startFlags,
	};

	async run(): Promise<void> {
		this.parse(StartCommand);
	}
}
