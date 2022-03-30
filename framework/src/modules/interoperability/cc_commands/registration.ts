/*
 * Copyright © 2022 Lisk Foundation
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
 */

import { BaseCrossChainCommand } from '../base_cross_chain_command';
import { CROSS_CHAIN_COMMAND_ID_REGISTRATION } from '../constants';
import { registrationCCMParamsSchema } from '../schema';

export class CrossChainRegistrationCommand extends BaseCrossChainCommand {
	public ID = CROSS_CHAIN_COMMAND_ID_REGISTRATION;
	public name = 'registration';
	public schema = registrationCCMParamsSchema;
	// TODO
	// eslint-disable-next-line @typescript-eslint/require-await
	public async execute(): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
