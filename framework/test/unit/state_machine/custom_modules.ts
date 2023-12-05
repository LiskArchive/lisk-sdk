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

import { TransactionVerifyResult, StateMachine, Modules } from '../../../src';

export class CustomCommand0 extends Modules.BaseCommand {
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

export class CustomModule0 extends Modules.BaseModule {
	public commands = [new CustomCommand0(this.stores, this.events)];
	public method = {
		testing: jest.fn(),
	} as unknown as Modules.BaseMethod;
	public endpoint: Modules.BaseEndpoint = {} as Modules.BaseEndpoint;

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
	public metadata(): Modules.ModuleMetadata {
		throw new Error('Method not implemented.');
	}
}

export class CustomModule1 extends Modules.BaseModule {
	public commands = [];
	public endpoint: Modules.BaseEndpoint = {} as Modules.BaseEndpoint;
	public method: Modules.BaseMethod = {} as Modules.BaseMethod;

	public verifyAssets = jest.fn();
	public beforeTransactionsExecute = jest.fn();
	public afterCommandExecute = jest.fn();

	public get name() {
		return 'customModule1';
	}
	public metadata(): Modules.ModuleMetadata {
		throw new Error('Method not implemented.');
	}
}

export class CustomCommand2 extends Modules.BaseCommand {
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
	public async execute(ctx: StateMachine.TransactionExecuteContext): Promise<void> {
		ctx.eventQueue.add('customModule1', 'customModule1 Name', Buffer.from([0, 0, 2]));
	}
}

export class CustomModule2 extends Modules.BaseModule {
	public endpoint: Modules.BaseEndpoint = {} as Modules.BaseEndpoint;
	public method: Modules.BaseMethod = {} as Modules.BaseMethod;
	public commands = [new CustomCommand2(this.stores, this.events)];

	public get name() {
		return 'customModule2';
	}

	public verifyTransaction = jest
		.fn()
		.mockResolvedValue({ status: TransactionVerifyResult.INVALID });

	// eslint-disable-next-line @typescript-eslint/require-await
	public async initGenesisState(ctx: StateMachine.GenesisBlockExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.name, this.name, Buffer.from([0, 0, 2]));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async finalizeGenesisState(ctx: StateMachine.GenesisBlockExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.name, this.name, Buffer.from([0, 0, 2]));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async beforeTransactionsExecute(ctx: StateMachine.BlockExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.name, this.name, Buffer.from([0, 0, 2]));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async afterTransactionsExecute(ctx: StateMachine.BlockAfterExecuteContext): Promise<void> {
		ctx.eventQueue.add(this.name, this.name, Buffer.from([0, 0, 2]));
	}

	public metadata(): Modules.ModuleMetadata {
		throw new Error('Method not implemented.');
	}
}

export class CustomCommand3 extends Modules.BaseCommand {
	public schema = {
		$id: '/lisk/customCommand3',
		type: 'object',
		properties: {
			data: {
				dataType: 'string',
				fieldNumber: 1,
			},
		},
	};

	public get name() {
		return 'customCommand3';
	}

	public verify = jest.fn().mockResolvedValue({ status: 1 });
	public execute = jest.fn().mockRejectedValue('Command execution failed');
}

export class CustomModule3 extends Modules.BaseModule {
	public commands = [new CustomCommand3(this.stores, this.events)];
	public method = {
		testing: jest.fn(),
	} as unknown as Modules.BaseMethod;
	public endpoint: Modules.BaseEndpoint = {} as Modules.BaseEndpoint;

	public get name() {
		return 'customModule3';
	}

	public verifyAssets = jest.fn();
	public initGenesisState = jest.fn();
	public beforeTransactionsExecute = jest.fn();
	public afterTransactionsExecute = jest.fn();
	public verifyTransaction = jest.fn().mockResolvedValue({ status: 1 });
	public beforeCommandExecute = jest.fn();
	public afterCommandExecute = jest.fn();
	public metadata(): Modules.ModuleMetadata {
		throw new Error('Method not implemented.');
	}
}
