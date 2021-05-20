/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { TransactionSignCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';

type SignFlags = typeof TransactionSignCommand.flags & { [key: string]: Record<string, unknown> };

export class SignCommand extends TransactionSignCommand {
	static flags: SignFlags = {
		...TransactionSignCommand.flags,
	};

	static args = [...TransactionSignCommand.args];

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		return app;
	}
}
