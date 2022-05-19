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

import { EventEmitter } from 'events';
import { Block, Transaction, BlockHeader, StateStore } from '@liskhq/lisk-chain';
import { Options } from '@liskhq/lisk-db';
import { AggregateCommit } from '../consensus/types';
import { ValidatorInfo } from '../consensus/certificate_generation/types';
import { Consensus as ABIConsensus } from '../../abi';

export interface Keypair {
	publicKey: Buffer;
	privateKey: Buffer;
	blsSecretKey: Buffer;
}

export interface Generator {
	readonly address: Buffer;
	readonly encryptedPassphrase: string;
}

export interface GenerationConfig {
	waitThreshold: number;
	generators: Generator[];
	force?: boolean;
	password?: string;
}

export interface GeneratorStore {
	get: (key: Buffer) => Promise<Buffer>;
	set: (key: Buffer, value: Buffer) => Promise<void>;
}

export interface Consensus {
	execute: (block: Block) => Promise<void>;
	isSynced: (height: number, maxHeightPrevoted: number) => boolean;
	getAggregateCommit: (stateStore: StateStore) => Promise<AggregateCommit>;
	certifySingleCommit: (blockHeader: BlockHeader, validatorInfo: ValidatorInfo) => void;
	getMaxRemovalHeight: () => Promise<number>;
	getGeneratorAtTimestamp: (
		stateStore: StateStore,
		height: number,
		timestamp: number,
	) => Promise<Buffer>;
	getSlotNumber: (timestamp: number) => number;
	getSlotTime: (slot: number) => number;
	getConsensusParams: (stateStore: StateStore, blockHeader: BlockHeader) => Promise<ABIConsensus>;
	readonly events: EventEmitter;
}

export interface WritableBlockAssets {
	getAsset: (moduleID: number) => Buffer | undefined;
	setAsset: (moduleID: number, value: Buffer) => void;
}

export interface GeneratorDB {
	clear: (options?: Options) => Promise<void>;
	put: (key: Buffer, val: Buffer) => Promise<void>;
	del: (key: Buffer) => Promise<void>;
	close: () => Promise<void>;
	get: (key: Buffer) => Promise<Buffer>;
	exists(key: Buffer): Promise<boolean>;
}

export interface BlockGenerateInput {
	height: number;
	timestamp: number;
	generatorAddress: Buffer;
	privateKey: Buffer;
	transactions?: Transaction[];
	db?: GeneratorDB;
}
