import * as fs from 'fs-extra';
import { Flags as flagParser } from '@oclif/core';
import { BaseIPCClientCommand } from '../base_ipc_client';

export class InvokeCommand extends BaseIPCClientCommand {
	static description = 'Invokes the provided endpoint.';

	static examples = [
		'endpoint:invoke {endpoint} {parameters}',
		'endpoint:invoke --data-path --file',
		`endpoint:invoke generator_getAllKeys`,
		`endpoint:invoke consensus_getBFTParameters '{"height": 2}' -d ~/.lisk/pos-mainchain --pretty`,
		`endpoint:invoke consensus_getBFTParameters -f ./input.json`,
	];

	static flags = {
		...BaseIPCClientCommand.flags,
		file: flagParser.string({
			char: 'f',
			description: 'Input file.',
		}),
	};

	static args = [
		{
			name: 'endpoint',
			description: 'Endpoint to invoke',
			required: true,
		},
		{
			name: 'params',
			description: 'Endpoint parameters (Optional)',
			required: false,
		},
	];

	async run(): Promise<void> {
		const { args, flags } = await this.parse(InvokeCommand);

		if (!this._client) {
			this.error('APIClient is not initialized.');
		}

		let response: Record<string, unknown>;
		let endpointArguments;

		try {
			if (flags.file !== undefined) {
				if (fs.existsSync(flags.file)) {
					endpointArguments = JSON.parse(fs.readFileSync(flags.file, 'utf8')) as {};
				} else {
					this.error(`${flags.file} does not exist.`);
				}
			} else if (args.params !== undefined) {
				endpointArguments = JSON.parse(args.params) as {};
			}

			if (endpointArguments === undefined) {
				response = await this._client.invoke(args.endpoint);
			} else {
				response = await this._client.invoke(args.endpoint, endpointArguments);
			}

			this.printJSON(response as unknown as Record<string, unknown>);
		} catch (error) {
			this.error((error as Error).message);
		}
	}
}
