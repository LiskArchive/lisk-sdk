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
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../base';
import { flags as commonFlags } from '../utils/flags';

export default class NetworkIdentifierCommand extends BaseCommand {
	static description = `
  Creates Network identifier for the given nethash and community identifier.
	`;

	static examples = [
		'network-identifier --nethash=Lisk --community-identifier=da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
	];

	static flags = {
		...BaseCommand.flags,
		nethash: flagParser.string(commonFlags.nethash),
		'community-identifier': flagParser.string(commonFlags.communityIdentifier),
	};

	// tslint:disable-next-line no-async-without-await
	async run(): Promise<void> {
		const {
			flags: { nethash, 'community-identifier': communityIdentifier },
		} = this.parse(NetworkIdentifierCommand);

		const networkIdentifier = getNetworkIdentifier(
			nethash as string,
			communityIdentifier as string,
		);
		this.print({ networkIdentifier });
	}
}
