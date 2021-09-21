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

import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../node/state_machine/types';
import { BaseCommand } from '../../base_command';
import { COMMAND_ID_VOTE } from '../constants';
import { voteCommandParamsSchema } from '../schemas';

export class VoteCommand extends BaseCommand {
	public id = COMMAND_ID_VOTE;
	public name = 'voteDelegate';
	public schema = voteCommandParamsSchema;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		_context: CommandVerifyContext<Record<string, unknown>>,
	): Promise<VerificationResult> {
		return {
			status: VerifyStatus.OK,
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async execute(_context: CommandExecuteContext<Record<string, unknown>>): Promise<void> {}
}
