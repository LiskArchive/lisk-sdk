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
import * as fs from 'fs';
import { Block } from '@liskhq/lisk-chain';
import { EngineConfig } from '../types';
import { Logger } from '../logger';
import { getPathFromDataPath } from './path';

export const readGenesisBlock = (config: EngineConfig, logger: Logger): Block => {
	if (config.genesis.block.blob) {
		logger.debug('Reading genesis block from blob hex string');
		return Block.fromBytes(Buffer.from(config.genesis.block.blob, 'hex'));
	}
	if (config.genesis.block.fromFile) {
		const filePath = getPathFromDataPath(config.genesis.block.fromFile, config.system.dataPath);
		logger.debug({ fromFile: filePath }, 'Reading genesis block from file');
		const genesisBlob = fs.readFileSync(filePath);
		return Block.fromBytes(genesisBlob);
	}
	throw new Error('Genesis block information is required');
};
