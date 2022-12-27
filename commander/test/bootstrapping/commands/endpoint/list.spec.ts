import * as apiClient from '@liskhq/lisk-api-client';
import { getConfig } from '../../../helpers/config';
import { BaseIPCClientCommand, ListCommand } from '../../../../src';
import * as appUtils from '../../../../src/utils/application';
import { Awaited } from '../../../types';

describe('endpoint:list command', () => {
	let metadata: { endpoints: { name: string; request?: any; response?: any }[]; name: string }[];
	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;
	beforeEach(async () => {
		metadata = [
			{
				endpoints: [
					{
						name: 'getBalance',
						request: {
							$id: '/token/endpoint/getBalance',
							type: 'object',
							properties: {
								address: { type: 'string', format: 'lisk32' },
								tokenID: { type: 'string', format: 'hex', minLength: 16, maxLength: 16 },
							},
							required: ['address', 'tokenID'],
						},
						response: {
							$id: '/token/endpoint/getBalanceResponse',
							type: 'object',
							required: ['availableBalance', 'lockedBalances'],
							properties: {
								availableBalance: { type: 'string', format: 'uint64' },
								lockedBalances: {
									type: 'array',
									items: {
										type: 'object',
										required: ['module', 'amount'],
										properties: {
											module: { type: 'string' },
											amount: { type: 'string', format: 'uint64' },
										},
									},
								},
							},
						},
					},
					{
						name: 'getBalances',
						request: {
							$id: '/token/endpoint/getBalance',
							type: 'object',
							properties: { address: { type: 'string', format: 'lisk32' } },
							required: ['address'],
						},
						response: {
							$id: '/token/endpoint/getBalancesResponse',
							type: 'object',
							required: ['balances'],
							properties: {
								balances: {
									type: 'array',
									items: {
										type: 'object',
										required: ['availableBalance', 'lockedBalances', 'tokenID'],
										properties: {
											tokenID: { type: 'string', format: 'hex' },
											availableBalance: { type: 'string', format: 'uint64' },
											lockedBalances: {
												type: 'array',
												items: {
													type: 'object',
													required: ['module', 'amount'],
													properties: {
														module: { type: 'string' },
														amount: { type: 'string', format: 'uint64' },
													},
												},
											},
										},
									},
								},
							},
						},
					},
				],
				name: 'token',
			},
			{
				endpoints: [
					{
						name: 'validateBLSKey',
						request: {
							$id: '/validators/validateBLSKey',
							title: 'Bls Key Properties',
							type: 'object',
							properties: {
								proofOfPossession: { type: 'string', format: 'hex' },
								blsKey: { type: 'string', format: 'hex' },
							},
							required: ['proofOfPossession', 'blsKey'],
						},
						response: {
							$id: '/validators/endpoint/validateBLSKeyResponse',
							title: 'Bls Key Properties',
							type: 'object',
							properties: { valid: { type: 'boolean' } },
							required: ['valid'],
						},
					},
					{
						name: 'getValidators',
						request: {},
						response: {},
					},
				],
				name: 'validators',
			},
		];
		stdout = [];
		stderr = [];
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			metadata,
			disconnect: jest.fn(),
		} as never);
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		jest.spyOn(BaseIPCClientCommand.prototype, 'printJSON');
	});

	it('should return empty results if provided module search string through -m flag does not exist', async () => {
		await ListCommand.run(['-m non-existent-character-combination'], config);

		expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledTimes(1);
		expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenLastCalledWith([]);
	});

	it('should return endpoints matching the module search string provdied through -m flag', async () => {
		await ListCommand.run(['-mto'], config);

		expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledTimes(1);
		expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledWith([
			'token_getBalance',
			'token_getBalances',
			'validators_validateBLSKey',
			'validators_getValidators',
		]);
	});

	it('should return endpoints matching the provided search string as parameter for all modules', async () => {
		await ListCommand.run(['get'], config);

		expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledTimes(1);
		expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledWith([
			'token_getBalance',
			'token_getBalances',
			'validators_getValidators',
		]);
	});

	it('should return endpoints matching the provided search string as parameter and the module search string provided through -m flag', async () => {
		await ListCommand.run(['valid', '-mto']);

		expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledTimes(1);
		expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenLastCalledWith([
			'validators_validateBLSKey',
			'validators_getValidators',
		]);
	});

	it('should return additional info; request and response objects for each endpoint when -i flag is provided', async () => {
		await ListCommand.run(['getBalances', '-i', '--pretty']);

		const name = `${metadata[0].name}_${metadata[0].endpoints[1].name}`;
		expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledTimes(1);
		expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenLastCalledWith([
			{ ...metadata[0].endpoints[1], name },
		]);
	});
});
