/*
 * LiskHQ/lisk-commander
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
 *
 */
import { Command, flags as flagParser } from '@oclif/command';
import { env } from './bootstrapping/env';

interface BootstrapFlags {
	readonly template?: string;
}

export default abstract class BaseBootstrapCommand extends Command {
	static flags = {
		template: flagParser.string({
			char: 't',
			description:
				'Template to bootstrap the application. It will read from `.liskrc.json` or use `lisk-ts` if not found.',
		}),
	};

	public bootstrapFlags!: BootstrapFlags;

	// eslint-disable-next-line @typescript-eslint/require-await
	async finally(error?: Error | string): Promise<void> {
		if (error) {
			this.error(error instanceof Error ? error.message : error);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async init(): Promise<void> {
		// Typing problem where constructor is not allow as Input<any> but it requires to be the type
		const { flags } = this.parse(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this.constructor as unknown) as flagParser.Input<any>,
		);
		this.bootstrapFlags = flags as BootstrapFlags;

		process.stdout.on('error', (err: { errno: string }): void => {
			if (err.errno !== 'EPIPE') {
				throw err;
			}
		});
	}

	protected async _runBootstrapCommand(command: string): Promise<void> {
		return new Promise((resolve, reject) => {
			env.run(
				command,
				{ template: this.bootstrapFlags.template, version: this.config.version },
				(err): void => {
					if (err) {
						this.error(err);
						return reject(err);
					}

					return resolve();
				},
			);
		});
	}
}
