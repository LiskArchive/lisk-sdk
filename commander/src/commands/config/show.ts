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
import BaseCommand from '../../base';

export default class ShowCommand extends BaseCommand {
	static description = `
		Prints the current configuration.
	`;

	static examples = ['config:show'];

	static flags = {
		...BaseCommand.flags,
	};

	async run(): Promise<void> {
		this.print(this.userConfig);
	}
}
