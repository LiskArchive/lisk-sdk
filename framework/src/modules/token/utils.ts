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

import { NotFoundError } from '@liskhq/lisk-chain';
import { APIContext } from '../../node/state_machine';
import {
	CHAIN_ID_ALIAS_NATIVE,
	CHAIN_ID_LENGTH,
	STORE_PREFIX_ESCROW,
	STORE_PREFIX_USER,
	TOKEN_ID_LENGTH,
	TOKEN_ID_LSK,
} from './constants';
import { EscrowStoreData, escrowStoreSchema, UserStoreData, userStoreSchema } from './schemas';
import { InteroperabilityAPI, TokenID } from './types';

export const splitTokenID = (tokenID: TokenID): [Buffer, Buffer] => {
	if (tokenID.length !== TOKEN_ID_LENGTH) {
		throw new Error(`Token ID must have length ${TOKEN_ID_LENGTH}`);
	}
	const chainID = tokenID.slice(0, CHAIN_ID_LENGTH);
	const localID = tokenID.slice(CHAIN_ID_LENGTH);

	return [chainID, localID];
};

export const getNativeTokenID = (tokenID: TokenID): TokenID => {
	const localID = tokenID.slice(CHAIN_ID_LENGTH);
	return Buffer.concat([CHAIN_ID_ALIAS_NATIVE, localID]);
};

export const getUserStoreKey = (address: Buffer, tokenID: TokenID) =>
	Buffer.concat([address, tokenID]);

export const tokenSupported = (supportedTokenIDs: Buffer[], tokenID: Buffer): boolean => {
	if (!supportedTokenIDs.length) {
		return true;
	}
	if (tokenID.equals(TOKEN_ID_LSK)) {
		return true;
	}

	if (supportedTokenIDs.some(id => id.equals(tokenID))) {
		return true;
	}
	return false;
};

export const updateAvailableBalance = async (
	apiContext: APIContext,
	moduleID: number,
	address: Buffer,
	tokenID: Buffer,
	amount: bigint,
): Promise<void> => {
	const userStore = apiContext.getStore(moduleID, STORE_PREFIX_USER);
	const recipient = await userStore.getWithSchema<UserStoreData>(
		getUserStoreKey(address, tokenID),
		userStoreSchema,
	);
	recipient.availableBalance += amount;
	await userStore.setWithSchema(getUserStoreKey(address, tokenID), recipient, userStoreSchema);
};

export const updateAvailableBalanceWithCreate = async (
	apiContext: APIContext,
	moduleID: number,
	address: Buffer,
	tokenID: Buffer,
	amount: bigint,
): Promise<void> => {
	const userStore = apiContext.getStore(moduleID, STORE_PREFIX_USER);
	let recipient: UserStoreData;
	try {
		recipient = await userStore.getWithSchema<UserStoreData>(
			getUserStoreKey(address, tokenID),
			userStoreSchema,
		);
	} catch (error) {
		if (!(error instanceof NotFoundError)) {
			throw error;
		}
		recipient = {
			availableBalance: BigInt(0),
			lockedBalances: [],
		};
	}
	recipient.availableBalance += amount;
	await userStore.setWithSchema(getUserStoreKey(address, tokenID), recipient, userStoreSchema);
};

export const addEscrowAmount = async (
	apiContext: APIContext,
	moduleID: number,
	sendingChainID: Buffer,
	localID: Buffer,
	amount: bigint,
): Promise<void> => {
	const escrowStore = apiContext.getStore(moduleID, STORE_PREFIX_ESCROW);
	const escrowKey = Buffer.concat([sendingChainID, localID]);
	let escrowData: EscrowStoreData;
	try {
		escrowData = await escrowStore.getWithSchema<EscrowStoreData>(escrowKey, escrowStoreSchema);
	} catch (error) {
		if (!(error instanceof NotFoundError)) {
			throw error;
		}
		escrowData = { amount: BigInt(0) };
	}
	escrowData.amount += amount;
	await escrowStore.setWithSchema(escrowKey, escrowData, escrowStoreSchema);
};

export const deductEscrowAmountWithTerminate = async (
	apiContext: APIContext,
	interopAPI: InteroperabilityAPI,
	moduleID: number,
	sendingChainID: Buffer,
	localID: Buffer,
	amount: bigint,
): Promise<void> => {
	const escrowStore = apiContext.getStore(moduleID, STORE_PREFIX_ESCROW);
	const escrowKey = Buffer.concat([sendingChainID, localID]);
	let escrowData: EscrowStoreData;
	try {
		escrowData = await escrowStore.getWithSchema<EscrowStoreData>(escrowKey, escrowStoreSchema);
	} catch (error) {
		if (!(error instanceof NotFoundError)) {
			throw error;
		}
		escrowData = { amount: BigInt(0) };
	}
	if (escrowData.amount < amount) {
		await interopAPI.terminateChain(apiContext, sendingChainID);
		return;
	}

	escrowData.amount -= amount;
	await escrowStore.setWithSchema(escrowKey, escrowData, escrowStoreSchema);
};
