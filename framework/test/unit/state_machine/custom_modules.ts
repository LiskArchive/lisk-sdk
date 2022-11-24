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

import { BaseMethod, BaseCommand, BaseEndpoint, BaseModule } from '../../../src';
import { TransactionVerifyResult } from '../../../src/abi';
import { ModuleMetadata } from '../../../src/modules/base_module';
import {
	BlockAfterExecuteContext,
	BlockExecuteContext,
	GenesisBlockExecuteContext,
	TransactionExecuteContext,
} from '../../../src/state_machine';

export class CustomCommand0 extends BaseCommand {
	public schema = {
		$id: '/lisk/customCommand0',
		type: 'object',
		properties: {
			data: {
				dataType: 'string',
				fieldNumber: 1,
			},
		},
	};

	public get name() {
		return 'customCommand0';
	}

	public verify = jest.fn().mockResolvedValue({ status: 1 });
	public execute = jest.fn();
}

export class CustomModule0 extends BaseModule {
	public commands = [new CustomCommand0(this.stores, this.events)];
	public method = {
		testing: jest.fn(),
	} as unknown as BaseMethod;
	public endpoint: BaseEndpoint = {} as BaseEndpoint;

	public get name() {
		return 'customModule0';
	}

	public verifyAssets = jest.fn();
	public initGenesisState = jest.fn();
	public beforeTransactionsExecute = jest.fn();
	public afterTransactionsExecute = jest.fn();
	public verifyTransaction = jest.fn().mockResolvedValue({ status: 1 });
	public beforeCommandExecute = jest.fn();
	public afterCommandExecute = jest.fn();
	public metadata(): ModuleMetadata {
		throw new Error('Method not implemented.');
	}
}

export class CustomModule1 extends BaseModule {
	public commands = [];
	public endpoint: BaseEndpoint = {} as BaseEndpoint;
	public method: BaseMethod = {} as BaseMethod;

	public verifyAssets = jest.fn();
	public beforeTransactionsExecute = jest.fn();
	public afterCommandExecute = jest.fn();

	public get name() {
		return 'customModule1';
	}
	public metadata(): ModuleMetadata {
		throw new Error('Method not implemented.');
	}
}

export class CustomCommand2 extends BaseCommand {
	public schema = {
		$id: '/lisk/customCommand2',
		type: 'object',
		properties: {
			data: {
				dataType: 'string',
				fieldNumber: 1,
			},
		},
	};

	public get name() {
		return 'customCommand2';
	}

	public verify = jest.fn().mockResolvedValue({ status: TransactionVerifyResult.INVALID });

	// eslint-disable-next-line @typescript-eslint/require-await
	public async execute(ctx: TransactionExecuteContext): Promise<void> {
		ctx.eventQueue.add('customModule1', 'customModule1 Name', Buffer.from([0, 0, 2]));
	}
}

export class CustomModule2 extends BaseModule {
	public endpoint: BaseEndpoint = {} as BaseEndpoint;
	public method: BaseMethod = {} as BaseMethod;
	public commands = [new CustomCommand2(this.stores, this.events)];

	public get name() {
		return 'customModule2';
	}

	public verifyTransaction = jest
		.fn()
		.mockResolvedValue({ status: TransactionVerifyResult.INVALID });

	// eslint-disable-next-line @typescript-eslint/require-await
	public async initGenesisState(ctx: GenesisBlockExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.name, this.name, Buffer.from([0, 0, 2]));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async finalizeGenesisState(ctx: GenesisBlockExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.name, this.name, Buffer.from([0, 0, 2]));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async beforeTransactionsExecute(ctx: BlockExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.name, this.name, Buffer.from([0, 0, 2]));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async afterTransactionsExecute(ctx: BlockAfterExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.name, this.name, Buffer.from([0, 0, 2]));
	}

	public metadata(): ModuleMetadata {
		throw new Error('Method not implemented.');
	}
}
