/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
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
import { Application, PartialApplicationConfig } from 'lisk-framework';
import { objects } from '@liskhq/lisk-utils';
import { Command, Flags as flagParser } from '@oclif/core';
import * as fs from 'fs-extra';
import { join, resolve } from 'path';
import { validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { GenesisAssetsInput, genesisAssetsSchema } from '../../../utils/genesis_creation';
import { flagsWithParser } from '../../../utils/flags';
import { getNetworkConfigFilesPath } from '../../../utils/path';

export abstract class BaseGenesisBlockCommand extends Command {
	static description = 'Creates genesis block file.';
	static examples = [
		'genesis-block:create --output mydir',
		'genesis-block:create --output mydir --assets-file ./assets.json',
	];

	static flags = {
		network: flagsWithParser.network,
		config: flagsWithParser.config,
		output: flagParser.string({
			char: 'o',
			description: 'Output folder path of the generated genesis block',
			default: 'config',
		}),
		'assets-file': flagParser.string({
			char: 'f',
			description: 'Path to file which contains genesis block asset in JSON format',
			required: true,
		}),
	};

	async run(): Promise<void> {
		const {
			flags: { output, config: configFilePath, network, 'assets-file': assetsFile },
		} = await this.parse(BaseGenesisBlockCommand);
		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /^([a-z]+)(([A-Z]([a-z]+))+)$/;
		if (regexCamelCase.test(output) || regexWhitespace.test(output)) {
			this.error('Invalid name');
		}
		const { configFilePath: defaultConfigFilepath } = getNetworkConfigFilesPath(
			this.getApplicationConfigDir(),
			network,
			true,
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		let config = await fs.readJSON(defaultConfigFilepath);
		if (configFilePath) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const customConfig = await fs.readJSON(resolve(configFilePath));
			config = objects.mergeDeep(config, customConfig);
		}
		// determine proper path
		const configPath = join(process.cwd(), output);
		const app = this.getApplication(config);
		// If assetsFile exist, create from assetsFile and default config/accounts are not needed
		const assetsJSON = (await fs.readJSON(resolve(assetsFile))) as GenesisAssetsInput;
		validator.validate(genesisAssetsSchema, assetsJSON);

		const genesisBlock = await app.generateGenesisBlock({
			assets: assetsJSON.assets.map(a => ({
				module: a.module,
				data: codec.fromJSON(a.schema, a.data),
				schema: a.schema,
			})),
			chainID: Buffer.from(app.config.genesis.chainID, 'hex'),
		});
		fs.mkdirSync(configPath, { recursive: true });
		fs.writeFileSync(resolve(configPath, 'genesis_block.blob'), genesisBlock.getBytes());
		this.log(`Genesis block files saved at: ${configPath}`);
	}

	abstract getApplication(config: PartialApplicationConfig): Application;
	abstract getApplicationConfigDir(): string;
}
