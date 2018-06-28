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
import BaseCommand from '../../base';
import print from '../../utils/print';

export default class GetCommand extends BaseCommand {
	async run() {
		print(this.printOptions).call(this, this.userConfig);
	}
}

GetCommand.flags = {
	...BaseCommand.flags,
};

GetCommand.description = `
Prints the current configuration.
`;
GetCommand.examples = ['config:get'];
