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

import { codec } from '@liskhq/lisk-codec';
import { encrypt } from '@liskhq/lisk-cryptography';
import { GENERATOR_STORE_INFO_PREFIX, GENERATOR_STORE_KEY_PREFIX } from './constants';
import { NotFoundError } from './errors';
import { GeneratorStore } from './generator_store';
import {
	encryptedMessageSchema,
	GeneratedInfo,
	generatorKeysSchema,
	plainGeneratorKeysSchema,
	previouslyGeneratedInfoSchema,
} from './schemas';
import { EncodedGeneratorKeys, GeneratorKeys, PlainGeneratorKeyData } from './types';

export const getGeneratedInfo = async (store: GeneratorStore) => {
	const subStore = store.getGeneratorStore(GENERATOR_STORE_INFO_PREFIX);
	const encodedGeneratedInfoList = await subStore.iterate({
		gte: Buffer.alloc(20, 0),
		lte: Buffer.alloc(20, 255),
	});

	const generatedInfoList = [];
	for (const { key, value } of encodedGeneratedInfoList) {
		const info = codec.decode<GeneratedInfo>(previouslyGeneratedInfoSchema, value);
		generatedInfoList.push({
			address: key,
			...info,
		});
	}
	return generatedInfoList;
};

export const setLastGeneratedInfo = async (
	store: GeneratorStore,
	generatorAddress: Buffer,
	header: GeneratedInfo,
): Promise<void> => {
	const subStore = store.getGeneratorStore(GENERATOR_STORE_INFO_PREFIX);
	const generatedInfo: GeneratedInfo = {
		height: header.height,
		maxHeightGenerated: header.maxHeightGenerated,
		maxHeightPrevoted: header.maxHeightPrevoted,
	};
	const encodedGeneratedInfo = codec.encode(previouslyGeneratedInfoSchema, generatedInfo);
	await subStore.set(generatorAddress, encodedGeneratedInfo);
};

export const getLastGeneratedInfo = async (
	store: GeneratorStore,
	generatorAddress: Buffer,
): Promise<GeneratedInfo> => {
	const subStore = store.getGeneratorStore(GENERATOR_STORE_INFO_PREFIX);
	const encodedGeneratedInfo = await subStore.get(generatorAddress);
	return codec.decode<GeneratedInfo>(previouslyGeneratedInfoSchema, encodedGeneratedInfo);
};

export const getOrDefaultLastGeneratedInfo = async (
	store: GeneratorStore,
	generatorAddress: Buffer,
): Promise<GeneratedInfo> => {
	try {
		const info = await getLastGeneratedInfo(store, generatorAddress);
		return info;
	} catch (error) {
		if (!(error instanceof NotFoundError)) {
			throw error;
		}
		return {
			height: 0,
			maxHeightGenerated: 0,
			maxHeightPrevoted: 0,
		};
	}
};

export const isZeroValueGeneratedInfo = (info: GeneratedInfo): boolean =>
	info.height === 0 && info.maxHeightGenerated === 0 && info.maxHeightPrevoted === 0;

export const isEqualGeneratedInfo = (g1: GeneratedInfo, g2: GeneratedInfo): boolean =>
	g1.height === g2.height &&
	g1.maxHeightGenerated === g2.maxHeightGenerated &&
	g1.maxHeightPrevoted === g2.maxHeightPrevoted;

export const getAllGeneratorKeys = async (store: GeneratorStore): Promise<GeneratorKeys[]> => {
	const subStore = store.getGeneratorStore(GENERATOR_STORE_KEY_PREFIX);
	const encodedGeneratorKeysList = await subStore.iterate({
		gte: Buffer.alloc(20, 0),
		lte: Buffer.alloc(20, 255),
	});
	const result = [];
	for (const { key, value } of encodedGeneratorKeysList) {
		const encodedGeneratorKeys = codec.decode<EncodedGeneratorKeys>(generatorKeysSchema, value);
		if (encodedGeneratorKeys.type === 'plain') {
			result.push({
				type: encodedGeneratorKeys.type,
				address: key,
				data: codec.decode<PlainGeneratorKeyData>(
					plainGeneratorKeysSchema,
					encodedGeneratorKeys.data,
				),
			});
			continue;
		}
		result.push({
			type: encodedGeneratorKeys.type,
			address: key,
			data: codec.decode<encrypt.EncryptedMessageObject>(
				encryptedMessageSchema,
				encodedGeneratorKeys.data,
			),
		});
	}
	return result;
};

export const getGeneratorKeys = async (
	store: GeneratorStore,
	address: Buffer,
): Promise<GeneratorKeys> => {
	const subStore = store.getGeneratorStore(GENERATOR_STORE_KEY_PREFIX);
	const encodedKeysBytes = await subStore.get(address);
	const encodedKeys = codec.decode<EncodedGeneratorKeys>(generatorKeysSchema, encodedKeysBytes);
	if (encodedKeys.type === 'plain') {
		return {
			address,
			type: encodedKeys.type,
			data: codec.decode<PlainGeneratorKeyData>(plainGeneratorKeysSchema, encodedKeys.data),
		};
	}

	return {
		address,
		type: encodedKeys.type,
		data: codec.decode<encrypt.EncryptedMessageObject>(encryptedMessageSchema, encodedKeys.data),
	};
};

export const setGeneratorKey = async (
	store: GeneratorStore,
	address: Buffer,
	keys: GeneratorKeys,
): Promise<void> => {
	const subStore = store.getGeneratorStore(GENERATOR_STORE_KEY_PREFIX);
	const schema = keys.type === 'plain' ? plainGeneratorKeysSchema : encryptedMessageSchema;
	const data = codec.encode(schema, keys.data);

	const encodedGeneratorKeys = codec.encode(generatorKeysSchema, { type: keys.type, data });
	await subStore.set(address, encodedGeneratorKeys);
};

export const generatorKeysExist = async (
	store: GeneratorStore,
	address: Buffer,
): Promise<boolean> => {
	const subStore = store.getGeneratorStore(GENERATOR_STORE_KEY_PREFIX);
	try {
		await subStore.get(address);
		return true;
	} catch (error) {
		if (error instanceof NotFoundError) {
			return false;
		}
		throw error;
	}
};
