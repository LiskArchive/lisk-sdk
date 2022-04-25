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

import { CommandExecuteContext } from '../../../../node/state_machine';
import { BaseCommand } from '../../../base_command';
import { COMMAND_ID_MAINCHAIN_CCU } from '../../constants';
import { crossChainUpdateTransactionParams } from '../../schema';

export class MainchainCCUpdateCommand extends BaseCommand {
	public name = 'mainchainCCUpdate';
	public id = COMMAND_ID_MAINCHAIN_CCU;
	public schema = crossChainUpdateTransactionParams;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async execute(_context: CommandExecuteContext<unknown>): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
