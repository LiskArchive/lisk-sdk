/* eslint-disable class-methods-use-this */

import {
    BaseCommand,
    CommandVerifyContext,
    CommandExecuteContext,
	VerificationResult,
	VerifyStatus,
} from 'lisk-sdk';

interface Params {
}

export class <%= commandClass %> extends BaseCommand {
	public schema = {
		$id: '<%= commandClass %>',
		type: 'object',
		properties: {},
	};

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(_context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		return { status: VerifyStatus.OK };
	}

	public async execute(_context: CommandExecuteContext<Params>): Promise<void> {
	}
}
