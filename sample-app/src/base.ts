/*
 * LiskHQ/lisk-sdk
 * Copyright © 2020 Lisk Foundation
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
import Command from '@oclif/command';
import * as fs from 'fs-extra';
import * as path from 'path';

export abstract class BaseCommand extends Command {
    async init(): Promise<void> {
        const defaultPath = path.join(this.config.configDir, 'default');
        const exist = await fs.pathExists(defaultPath);
        if (!exist) {
            await fs.ensureDir(defaultPath);
            // Copy defualt config if it doesn't exist
            await fs.copy(path.join(__dirname, '../config'), defaultPath);
        }
    }
}