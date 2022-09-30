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
import { NotFoundError } from '@liskhq/lisk-db';
import { MethodContext } from '../../../state_machine';
import { BaseStore, StoreGetter } from '../../base_store';
import { InteroperabilityMethod } from '../types';

export interface EscrowStoreData {
	amount: bigint;
}

export const escrowStoreSchema = {
	$id: '/token/store/escrow',
	type: 'object',
	required: ['amount'],
	properties: {
		amount: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
	},
};

export class EscrowStore extends BaseStore<EscrowStoreData> {
	public schema = escrowStoreSchema;

	public getKey(escrowChainID: Buffer, tokenID: Buffer): Buffer {
		return Buffer.concat([escrowChainID, tokenID]);
	}

	public async createDefaultAccount(
		context: StoreGetter,
		chainID: Buffer,
		tokenID: Buffer,
	): Promise<void> {
		await this.set(context, this.getKey(chainID, tokenID), { amount: BigInt(0) });
	}

	public async addAmount(
		context: StoreGetter,
		chainID: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
		let escrowData: EscrowStoreData;
		const escrowKey = Buffer.concat([chainID, tokenID]);
		try {
			escrowData = await this.get(context, escrowKey);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			escrowData = { amount: BigInt(0) };
		}
		escrowData.amount += amount;
		await this.set(context, escrowKey, escrowData);
	}

	public async deductEscrowAmountWithTerminate(
		context: MethodContext,
		interopMethod: InteroperabilityMethod,
		sendingChainID: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
		let escrowData: EscrowStoreData;
		const escrowKey = Buffer.concat([sendingChainID, tokenID]);
		try {
			escrowData = await this.get(context, escrowKey);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			escrowData = { amount: BigInt(0) };
		}
		if (escrowData.amount < amount) {
			await interopMethod.terminateChain(context, sendingChainID);
			return;
		}

		escrowData.amount -= amount;
		await this.set(context, escrowKey, escrowData);
	}
}
