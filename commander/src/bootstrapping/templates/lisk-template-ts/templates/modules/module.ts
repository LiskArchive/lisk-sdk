/*
 * LiskHQ/lisk-commander
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

/* eslint-disable class-methods-use-this */

import { BaseModule, AfterBlockApplyContext, TransactionApplyContext, BeforeBlockApplyContext, AfterGenesisBlockApplyContext, GenesisConfig } from 'lisk-sdk';

export default class <%= moduleClass %> extends BaseModule {
    public actions = {
        // Example below
        // getBalance: async (params) => this._dataAccess.account.get(params.address).token.balance,
        // getBlockByID: async (params) => this._dataAccess.blocks.get(params.id),
    };
    public reducers = {
        // Example below
        // getBalance: async (
		// 	params: Record<string, unknown>,
		// 	stateStore: StateStore,
		// ): Promise<bigint> => {
		// 	const { address } = params;
		// 	if (!Buffer.isBuffer(address)) {
		// 		throw new Error('Address must be a buffer');
		// 	}
		// 	const account = await stateStore.account.getOrDefault<TokenAccount>(address);
		// 	return account.token.balance;
		// },
    };
    public name = '<%= moduleName %>';
    public transactionAssets = [];
    public events = [
        // Example below
        //'<%= moduleName %>:newBlock',
    ];
    public id = <%= moduleID %>;

    public constructor(genesisConfig: GenesisConfig) {
        super(genesisConfig);
    }

    // Lifecycle hooks
    public async beforeBlockApply(input: BeforeBlockApplyContext) {
        // Get any data from stateStore using block info, below is an example getting a generator
        // const generatorAddress = getAddressFromPublicKey(input.block.header.generatorPublicKey);
		// const generator = await input.stateStore.account.get<TokenAccount>(generatorAddress);
    }

    public async afterBlockApply(input: AfterBlockApplyContext) {
        // Get any data from stateStore using block info, below is an example getting a generator
        // const generatorAddress = getAddressFromPublicKey(input.block.header.generatorPublicKey);
		// const generator = await input.stateStore.account.get<TokenAccount>(generatorAddress);
    }

    public async beforeTransactionApply(input: TransactionApplyContext) {
        // Get any data from stateStore using transaction info, below is an example
        // const sender = await input.stateStore.account.getOrDefault<TokenAccount>(input.transaction.senderAddress);
    }

    public async afterTransactionApply(input: TransactionApplyContext) {
        // Get any data from stateStore using transaction info, below is an example
        // const sender = await input.stateStore.account.getOrDefault<TokenAccount>(input.transaction.senderAddress);
    }

    public async afterGenesisBlockApply(input: AfterGenesisBlockApplyContext) {
        // Get any data from genesis block, for example get all genesis accounts
        // const genesisAccoounts = genesisBlock.header.asset.accounts;
    }
}
