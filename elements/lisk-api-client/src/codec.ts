/*
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

import { codec, Schema } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import { RegisteredSchemas } from './types';

export const getTransactionParamsSchema = (
	transaction: Record<string, unknown>,
	registeredSchema: RegisteredSchemas,
): Schema => {
	const txParamsSchema = registeredSchema.commands.find(
		paramsSchema =>
			paramsSchema.moduleID === transaction.moduleID &&
			paramsSchema.commandID === transaction.commandID,
	);
	if (!txParamsSchema) {
		throw new Error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			`ModuleID: ${transaction.moduleID} AssetID: ${transaction.commandID} is not registered.`,
		);
	}
	return txParamsSchema.schema;
};

export const decodeTransaction = (
	encodedTransaction: Buffer,
	registeredSchema: RegisteredSchemas,
): Record<string, unknown> => {
	const transaction = codec.decode<{
		[key: string]: unknown;
		params: Buffer;
		moduleID: number;
		commandID: number;
	}>(registeredSchema.transaction, encodedTransaction);
	const paramsSchema = getTransactionParamsSchema(transaction, registeredSchema);
	const params = codec.decode(paramsSchema, transaction.params);
	const id = hash(encodedTransaction);
	return {
		...transaction,
		params,
		id,
	};
};

export const encodeTransaction = (
	transaction: Record<string, unknown>,
	registeredSchema: RegisteredSchemas,
): Buffer => {
	const paramsSchema = getTransactionParamsSchema(transaction, registeredSchema);
	const encodedParams = codec.encode(paramsSchema, transaction.params as Record<string, unknown>);

	const decodedTransaction = codec.encode(registeredSchema.transaction, {
		...transaction,
		params: encodedParams,
	});

	return decodedTransaction;
};

export const decodeBlock = (
	encodedBlock: Buffer,
	registeredSchema: RegisteredSchemas,
): Record<string, unknown> => {
	const block = codec.decode<{ header: Buffer; assets: Buffer[]; payload: Buffer[] }>(
		registeredSchema.block,
		encodedBlock,
	);

	const header = codec.decode<{ [key: string]: unknown; version: number }>(
		registeredSchema.blockHeader,
		block.header,
	);
	const id = hash(block.header);
	const payload = [];
	for (const tx of block.payload) {
		payload.push(decodeTransaction(tx, registeredSchema));
	}

	return {
		header: {
			...header,
			id,
		},
		assets: block.assets,
		payload,
	};
};

export const encodeBlock = (
	block: { header: Record<string, unknown>; payload: Record<string, unknown>[]; assets: string[] },
	registeredSchema: RegisteredSchemas,
): Buffer => {
	const encodedPayload = block.payload.map(p => encodeTransaction(p, registeredSchema));
	const encodedAssets = block.assets.map(asset => Buffer.from(asset, 'hex'));
	const encodedBlockHeader = codec.encode(registeredSchema.blockHeader, block.header);

	return codec.encode(registeredSchema.block, {
		header: encodedBlockHeader,
		payload: encodedPayload,
		assets: encodedAssets,
	});
};
