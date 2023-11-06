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

import * as cryptography from '@liskhq/lisk-cryptography';
import { MethodContext } from '../../state_machine';
import { BaseMethod } from '../base_method';
import { InitializeEscrowAccountEvent } from './events/initialize_escrow_account';
import { InitializeUserAccountEvent } from './events/initialize_user_account';
import { TransferEvent } from './events/transfer';
import { EscrowStore } from './stores/escrow';
import { UserStore } from './stores/user';
import { FeeMethod, ModuleConfig } from './types';
import { InsufficientBalanceError } from '../../errors';

export class InternalMethod extends BaseMethod {
	private _feeMethod!: FeeMethod;
	private _config!: ModuleConfig;

	public init(config: ModuleConfig): void {
		this._config = config;
	}

	public addDependencies(feeMethod: FeeMethod) {
		this._feeMethod = feeMethod;
	}

	public async initializeUserAccount(
		methodContext: MethodContext,
		address: Buffer,
		tokenID: Buffer,
	): Promise<void> {
		this._feeMethod.payFee(methodContext, this._config.userAccountInitializationFee);
		await this.stores.get(UserStore).createDefaultAccount(methodContext, address, tokenID);
		this.events.get(InitializeUserAccountEvent).log(methodContext, {
			address,
			initializationFee: this._config.userAccountInitializationFee,
			tokenID,
		});
	}

	public async initializeEscrowAccount(
		methodContext: MethodContext,
		chainID: Buffer,
		tokenID: Buffer,
	): Promise<void> {
		this._feeMethod.payFee(methodContext, this._config.escrowAccountInitializationFee);
		await this.stores.get(EscrowStore).createDefaultAccount(methodContext, chainID, tokenID);
		this.events.get(InitializeEscrowAccountEvent).log(methodContext, {
			chainID,
			initializationFee: this._config.escrowAccountInitializationFee,
			tokenID,
		});
	}

	public async transfer(
		methodContext: MethodContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
		const userStore = this.stores.get(UserStore);

		const senderAccountKey = userStore.getKey(senderAddress, tokenID);
		const senderAccount = await userStore.get(methodContext, senderAccountKey);
		if (senderAccount.availableBalance < amount) {
			throw new InsufficientBalanceError(
				cryptography.address.getLisk32AddressFromAddress(senderAddress),
				senderAccount.availableBalance.toString(),
				amount.toString(),
			);
		}

		senderAccount.availableBalance -= amount;
		await userStore.save(methodContext, senderAddress, tokenID, senderAccount);

		const recipientAccountKey = userStore.getKey(recipientAddress, tokenID);
		const recipientAccount = await userStore.get(methodContext, recipientAccountKey);
		recipientAccount.availableBalance += amount;
		await userStore.save(methodContext, recipientAddress, tokenID, recipientAccount);

		this.events.get(TransferEvent).log(methodContext, {
			senderAddress,
			recipientAddress,
			tokenID,
			amount,
		});
	}
}
