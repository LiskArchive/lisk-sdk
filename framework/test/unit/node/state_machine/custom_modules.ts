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
/* eslint-disable max-classes-per-file */

import {
	BlockAfterExecuteContext,
	BlockExecuteContext,
	GenesisBlockExecuteContext,
	TransactionExecuteContext,
} from '../../../../src/node/state_machine';

export class CustomCommand0 {
	public id = 0;
	public name = 'customCommand0';
	public schema = {
		$id: 'lisk/custom-command-0',
		type: 'object',
		properties: {
			data: {
				dataType: 'string',
				fieldNumber: 1,
			},
		},
	};

	public verify = jest.fn().mockResolvedValue({ status: 1 });
	public execute = jest.fn();
}

export class CustomModule0 {
	public id = 3;
	public name = 'customModule0';
	public commands = [new CustomCommand0()];
	public api = {
		testing: jest.fn(),
	};

	public verifyAssets = jest.fn();
	public initGenesisState = jest.fn();
	public beforeTransactionsExecute = jest.fn();
	public afterTransactionsExecute = jest.fn();
	public verifyTransaction = jest.fn().mockResolvedValue({ status: 1 });
	public beforeCommandExecute = jest.fn();
	public afterCommandExecute = jest.fn();
}

export class CustomModule1 {
	public id = 4;
	public name = 'customModule1';
	public commands = [];

	public verifyAssets = jest.fn();
	public beforeTransactionsExecute = jest.fn();
	public afterCommandExecute = jest.fn();
}

export class CustomCommand2 {
	public id = 0;
	public name = 'customCommand2';
	public schema = {
		$id: 'lisk/custom-command-2',
		type: 'object',
		properties: {
			data: {
				dataType: 'string',
				fieldNumber: 1,
			},
		},
	};

	public verify = jest.fn().mockResolvedValue({ status: 1 });

	// eslint-disable-next-line @typescript-eslint/require-await
	public async execute(ctx: TransactionExecuteContext): Promise<void> {
		ctx.eventQueue.add(5, Buffer.from([0, 0, 0, 1]), Buffer.from([0, 0, 2]));
	}
}

export class CustomModule2 {
	public id = 5;
	public name = 'customModule2';
	public commands = [new CustomCommand2()];

	public verifyTransaction = jest.fn().mockResolvedValue({ status: 0 });

	// eslint-disable-next-line @typescript-eslint/require-await
	public async initGenesisState(ctx: GenesisBlockExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.id, Buffer.from([0, 0, 0, 1]), Buffer.from([0, 0, 2]));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async finalizeGenesisState(ctx: GenesisBlockExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.id, Buffer.from([0, 0, 0, 1]), Buffer.from([0, 0, 2]));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async beforeTransactionsExecute(ctx: BlockExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.id, Buffer.from([0, 0, 0, 1]), Buffer.from([0, 0, 2]));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async afterTransactionsExecute(ctx: BlockAfterExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.id, Buffer.from([0, 0, 0, 1]), Buffer.from([0, 0, 2]));
	}
}
