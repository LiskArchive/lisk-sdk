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
import { encrypt } from '@liskhq/lisk-cryptography';
import { IterateOptions } from '@liskhq/lisk-db';
import { AggregateCommit } from '../consensus/types';
import { ValidatorInfo } from '../consensus/certificate_generation/types';
import { JSONObject } from '../../types';

export interface Keypair {
	publicKey: Buffer;
	privateKey: Buffer;
	blsPublicKey: Buffer;
	blsSecretKey: Buffer;
}

export interface Generator {
	readonly address: Buffer;
	readonly encryptedPassphrase: string;
}

export interface GeneratorStore {
	get: (key: Buffer) => Promise<Buffer>;
	set: (key: Buffer, value: Buffer) => Promise<void>;
}

export interface Consensus {
	execute: (block: Block) => Promise<void>;
	syncing(): boolean;
	isSynced: (height: number, maxHeightPrevoted: number) => boolean;
	finalizedHeight: () => number;
	getAggregateCommit: (stateStore: StateStore) => Promise<AggregateCommit>;
	certifySingleCommit: (blockHeader: BlockHeader, validatorInfo: ValidatorInfo) => void;
	getMaxRemovalHeight: () => Promise<number>;
	readonly events: EventEmitter;
}

export interface WritableBlockAssets {
	getAsset: (module: string) => Buffer | undefined;
	setAsset: (module: string, value: Buffer) => void;
}

export interface GeneratorDB {
	clear: (options?: IterateOptions) => Promise<void>;
	set: (key: Buffer, val: Buffer) => Promise<void>;
	del: (key: Buffer) => Promise<void>;
	close: () => void;
	get: (key: Buffer) => Promise<Buffer>;
	has(key: Buffer): Promise<boolean>;
	iterate(options?: IterateOptions): NodeJS.ReadableStream;
}

export interface BlockGenerateInput {
	height: number;
	timestamp: number;
	generatorAddress: Buffer;
	privateKey: Buffer;
	transactions?: Transaction[];
	db?: GeneratorDB;
}

export interface EncodedGeneratorKeys {
	type: 'encrypted' | 'plain';
	data: Buffer;
}

interface EncryptedGeneratorKeys {
	type: 'encrypted';
	address: Buffer;
	data: encrypt.EncryptedMessageObject;
}

export interface PlainGeneratorKeyData {
	generatorKey: Buffer;
	generatorPrivateKey: Buffer;
	blsKey: Buffer;
	blsPrivateKey: Buffer;
}

export type PlainGeneratorKeyDataJSON = JSONObject<PlainGeneratorKeyData>;

interface PlainGeneratorKeys {
	type: 'plain';
	address: Buffer;
	data: PlainGeneratorKeyData;
}

export type GeneratorKeys = EncryptedGeneratorKeys | PlainGeneratorKeys;

export interface KeysFile {
	keys: {
		address: string;
		plain?: PlainGeneratorKeyDataJSON;
		encrypted?: encrypt.EncryptedMessageObject;
	}[];
}
