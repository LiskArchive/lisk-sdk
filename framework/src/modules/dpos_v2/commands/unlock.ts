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
 */
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
 */

import { CommandExecuteContext } from '../../../node/state_machine/types';
import { BaseCommand } from '../../base_command';
import { COMMAND_ID_UNLOCK } from '../constants';
import { unlockCommandParams } from '../schemas';

export class UnlockCommand extends BaseCommand {
	public id = COMMAND_ID_UNLOCK;
	public name = 'unlockToken';
	public schema = unlockCommandParams;

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async execute(_context: CommandExecuteContext<Record<string, unknown>>): Promise<void> {}
}
