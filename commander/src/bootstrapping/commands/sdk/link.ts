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
 *
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Command } from '@oclif/command';
import { symlink, pathExistsSync, removeSync } from 'fs-extra';
import { join, isAbsolute } from 'path';

export class LinkCommand extends Command {
	static description = 'Symlink specific SDK folder during development.';

	static examples = ['sdk:link /path/to/lisk-sdk/sdk'];

	static args = [
		{ name: 'targetSDKFolder', required: true, description: 'The path to the lisk SDK folder' },
	];

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/require-await
	async run(): Promise<void> {
		const {
			args: { targetSDKFolder },
		} = this.parse(LinkCommand);

		if (!pathExistsSync(targetSDKFolder)) {
			throw new Error(`Path '${targetSDKFolder as string}' does not exist or access denied.`);
		}

		const sdkLocalPath = join(__dirname, '../../../', 'node_modules', 'lisk-sdk');

		// If targetSDK folder is relative path, it should be relative from the node_module
		const targetSDKFolderFromNodeModule = isAbsolute(targetSDKFolder)
			? targetSDKFolder
			: join('../', targetSDKFolder);
		removeSync(sdkLocalPath);
		await symlink(targetSDKFolderFromNodeModule, sdkLocalPath);
		this.log(`Linked '${targetSDKFolder as string}' to '${sdkLocalPath}'.`);
	}
}
