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
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../../base';
import { NETWORK } from '../../../utils/constants';

const INSTALL_PATH = '~/.lisk/network';

export default class DatabaseCommand extends BaseCommand {
	static description = `Install lisk software`;

	static examples = [
		'node:install',
		'node:install --installation-path=/opt/lisk/lisk-testnet --network=testnet',
		'node:install --no-snapshot',
	];

	static flags = {
		...BaseCommand.flags,
		network: flagParser.string({
			char: 'n',
			description: 'Name of the network to start.',
			default: NETWORK.MAINNET,
			options: [NETWORK.MAINNET, NETWORK.TESTNET, NETWORK.BETANET],
		}),
		installationPath: flagParser.string({
			char: 'p',
			description: 'Path of Lisk Core to install.',
			default: INSTALL_PATH,
		}),
	};

	async run(): Promise<void> {
		this.parse(DatabaseCommand);
	}
}
