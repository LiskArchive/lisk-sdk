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
import { Command, flags as flagParser } from '@oclif/command';

export default class BaseCommand extends Command {
	async init() {
		const { flags } = this.parse(this.constructor);
		this.flags = flags;
	}

	async catch(error) {
		this.log({ error });
	}

	async finally(error) {
		if (error) {
			this.error(error);
		}
	}
}

BaseCommand.flags = {
	json: flagParser.boolean(),
};
