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

const { network, installationPath, name } = InstallCommand.flags;

export default class CacheCommand extends BaseCommand {
	static description = 'Start Lisk Core Cache';

	static examples = [
		'node:start:cache',
		'node:start:cache --network=testnet',
		'node:start:cache --installation-path=/opt/lisk/lisk-testnet --network=testnet',
	];

	static flags = {
		...BaseCommand.flags,
		network,
		installationPath,
		name,
	};

	async run(): Promise<void> {
		this.parse(CacheCommand);
	}
}
