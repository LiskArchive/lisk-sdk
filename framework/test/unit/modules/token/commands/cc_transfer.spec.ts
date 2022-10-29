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

import { codec } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import { utils } from '@liskhq/lisk-cryptography';
import {
	TokenMethod,
	TokenModule,
	Transaction,
	VerificationResult,
	VerifyStatus,
} from '../../../../../src';
import { CCTransferCommand } from '../../../../../src/modules/token/commands/cc_transfer';
import {
	CCM_STATUS_OK,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
} from '../../../../../src/modules/token/constants';
import { crossChainTransferParamsSchema } from '../../../../../src/modules/token/schemas';
import { EventQueue } from '../../../../../src/state_machine';
import { EscrowStore } from '../../../../../src/modules/token/stores/escrow';
import { UserStore } from '../../../../../src/modules/token/stores/user';
import { createTransactionContext } from '../../../../../src/testing';
import { InitializeEscrowAccountEvent } from '../../../../../src/modules/token/events/initialize_escrow_account';
import { TransferCrossChainEvent } from '../../../../../src/modules/token/events/transfer_cross_chain';

interface Params {
	tokenID: Buffer;
	amount: bigint;
	receivingChainID: Buffer;
	recipientAddress: Buffer;
	data: string;
	messageFee: bigint;
	escrowInitializationFee: bigint;
}

describe('CCTransfer command', () => {
	let command: CCTransferCommand;
	const module = new TokenModule();
	const method = new TokenMethod(module.stores, module.events, module.name);

	const defaultOwnChainID = Buffer.from([0, 0, 0, 1]);
	const defaultReceivingChainID = Buffer.from([0, 0, 1, 0]);
	const defaultTokenID = Buffer.concat([defaultOwnChainID, Buffer.alloc(4)]);
	const defaultEscrowFeeTokenId = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
	const defaultUserAccountInitializationFee = BigInt('50000000');
	const defaultEscrowAccountInitializationFee = BigInt('50000000');

	let validParams: Params;

	const createTransactionContextWithOverridingParams = (params: Record<string, unknown>) =>
		createTransactionContext({
			transaction: new Transaction({
				module: module.name,
				command: command.name,
				fee: BigInt(5000000),
				nonce: BigInt(0),
				senderPublicKey: utils.getRandomBytes(32),
				params: codec.encode(crossChainTransferParamsSchema, {
					...validParams,
					...params,
				}),
				signatures: [utils.getRandomBytes(64)],
			}),
		});

	const createInsufficientBalanceError = (
		senderAddress: Buffer,
		availableBalance: BigInt,
		tokenID: Buffer,
		amount: BigInt,
	) =>
		`${cryptography.address.getLisk32AddressFromAddress(
			senderAddress,
		)} balance ${availableBalance.toString()} for ${tokenID.toString(
			'hex',
		)} is not sufficient for ${amount.toString()}.`;

	const checkEventResult = (
		eventQueue: EventQueue,
		length: number,
		EventClass: any,
		index: number,
		expectedResult: any,
	) => {
		expect(eventQueue.getEvents()).toHaveLength(length);
		expect(eventQueue.getEvents()[index].toObject().name).toEqual(new EventClass('token').name);

		const eventData = codec.decode<Record<string, unknown>>(
			new EventClass('token').schema,
			eventQueue.getEvents()[index].toObject().data,
		);

		expect(eventData).toEqual({ ...expectedResult, result: 0 });
	};

	let interoperabilityMethod: {
		getOwnChainAccount: jest.Mock;
		send: jest.Mock;
		error: jest.Mock;
		terminateChain: jest.Mock;
		getChannel: jest.Mock;
		getMessageFeeTokenID: jest.Mock;
	};

	beforeAll(() => {
		command = new CCTransferCommand(module.stores, module.events);

		interoperabilityMethod = {
			getOwnChainAccount: jest.fn().mockResolvedValue({ id: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn(),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
			getMessageFeeTokenID: jest.fn(),
		};

		method.addDependencies(interoperabilityMethod as never);

		method.init({
			ownChainID: defaultOwnChainID,
			escrowAccountInitializationFee: defaultEscrowAccountInitializationFee,
			userAccountInitializationFee: defaultUserAccountInitializationFee,
			feeTokenID: defaultTokenID,
		});

		command.init({
			moduleName: module.name,
			method,
			interoperabilityMethod,
			escrowFeeTokenID: defaultEscrowFeeTokenId,
			escrowInitializationFee: defaultEscrowAccountInitializationFee,
			ownChainID: defaultOwnChainID,
		});
	});

	describe('verify', () => {
		const expectSchemaValidationError = (result: VerificationResult, message: string) => {
			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(message);
		};

		beforeEach(() => {
			validParams = {
				tokenID: defaultTokenID,
				amount: BigInt(100000000),
				receivingChainID: defaultReceivingChainID,
				recipientAddress: utils.getRandomBytes(20),
				data: '1'.repeat(64),
				messageFee: BigInt(1000),
				escrowInitializationFee: defaultEscrowAccountInitializationFee,
			};
		});

		it('should fail when tokenID does not have valid length', async () => {
			const tokenMinLengthContext = createTransactionContextWithOverridingParams({
				tokenID: Buffer.from('00', 'hex'),
			});

			const tokenMaxLengthContext = createTransactionContextWithOverridingParams({
				tokenID: Buffer.from('00000000000000000000000000', 'hex'),
			});

			expectSchemaValidationError(
				await command.verify(
					tokenMinLengthContext.createCommandVerifyContext(crossChainTransferParamsSchema),
				),
				"'.tokenID' minLength not satisfied",
			);

			expectSchemaValidationError(
				await command.verify(
					tokenMaxLengthContext.createCommandExecuteContext(crossChainTransferParamsSchema),
				),
				"'.tokenID' maxLength exceeded",
			);
		});

		it('should fail when receiving chainID does not have valid length', async () => {
			const receivingChainIDMinLengthContext = createTransactionContextWithOverridingParams({
				receivingChainID: Buffer.from([0, 1]),
			});

			const receivingChainIDMaxLengthContext = createTransactionContextWithOverridingParams({
				receivingChainID: Buffer.from([0, 1, 0, 0, 1]),
			});

			expectSchemaValidationError(
				await command.verify(
					receivingChainIDMinLengthContext.createCommandVerifyContext(
						crossChainTransferParamsSchema,
					),
				),
				"'.receivingChainID' minLength not satisfied",
			);

			expectSchemaValidationError(
				await command.verify(
					receivingChainIDMaxLengthContext.createCommandExecuteContext(
						crossChainTransferParamsSchema,
					),
				),
				"'.receivingChainID' maxLength exceed",
			);
		});

		it('should fail when recipientAddress is not 20 bytes', async () => {
			const invalidRecipientAddressContext = createTransactionContextWithOverridingParams({
				recipientAddress: utils.getRandomBytes(32),
			});

			expectSchemaValidationError(
				await command.verify(
					invalidRecipientAddressContext.createCommandVerifyContext(crossChainTransferParamsSchema),
				),
				"'.recipientAddress' address length invalid",
			);
		});

		it('should fail when data exceeds 64 characters', async () => {
			const invalidDataContext = createTransactionContextWithOverridingParams({
				data: '1'.repeat(65),
			});

			expectSchemaValidationError(
				await command.verify(
					invalidDataContext.createCommandVerifyContext(crossChainTransferParamsSchema),
				),
				"'.data' must NOT have more than 64 characters",
			);
		});

		it('should fail when chainID of the tokenID is other than ownChainID, receivingChainID or MAINCHAINID', async () => {
			const invalidtokenChainIDContext = createTransactionContextWithOverridingParams({
				tokenID: Buffer.from([0, 0, 1, 1, 0, 0, 0, 0]),
			});

			expectSchemaValidationError(
				await command.verify(
					invalidtokenChainIDContext.createCommandExecuteContext(crossChainTransferParamsSchema),
				),
				'Token must be native to either the sending or the receiving chain or the mainchain.',
			);
		});

		it('should fail for non existent account if escrow initialization fee is not what is configured in init', async () => {
			const invalidEscrowInitializationFee = createTransactionContextWithOverridingParams({
				escrowInitializationFee: BigInt(50),
			});

			expectSchemaValidationError(
				await command.verify(
					invalidEscrowInitializationFee.createCommandVerifyContext(crossChainTransferParamsSchema),
				),
				'Invalid escrow initialization fee.',
			);
		});

		describe('when chainID of the tokenID is equal to ownChainID, receivingChainID or mainChainID and escrowAccount does not exist', () => {
			describe('when params.tokenID is equal to configured escrowFeeTokenID and messageFeeTokenID', () => {
				it('should fail when sender balance is less than the sum of twice of the amount and escrowInitializationFee', async () => {
					const userStore = module.stores.get(UserStore);
					const commonTokenID = Buffer.concat([defaultOwnChainID, Buffer.from([0, 0, 0, 0])]);
					const amount = BigInt(50);
					const senderBalance =
						defaultEscrowAccountInitializationFee + amount * BigInt(2) - BigInt(1);

					command['_escrowFeeTokenID'] = commonTokenID;

					const insufficientBalanceContext = createTransactionContextWithOverridingParams({
						amount,
						tokenID: commonTokenID,
					});

					jest
						.spyOn(interoperabilityMethod, 'getMessageFeeTokenID')
						.mockResolvedValue(commonTokenID);

					await userStore.save(
						insufficientBalanceContext.createCommandExecuteContext<Params>(
							crossChainTransferParamsSchema,
						),
						insufficientBalanceContext.transaction.senderAddress,
						commonTokenID,
						{
							availableBalance: senderBalance,
							lockedBalances: [],
						},
					);

					expectSchemaValidationError(
						await command.verify(
							insufficientBalanceContext.createCommandVerifyContext(crossChainTransferParamsSchema),
						),
						createInsufficientBalanceError(
							insufficientBalanceContext.transaction.senderAddress,
							senderBalance,
							commonTokenID,
							amount * BigInt(2) + defaultEscrowAccountInitializationFee,
						),
					);
				});

				it('should pass when sender balance is sufficient for the sum of twice of the amount and escrowInitializationFee', async () => {
					const userStore = module.stores.get(UserStore);
					const commonTokenID = Buffer.concat([defaultOwnChainID, Buffer.from([0, 0, 0, 0])]);
					const amount = BigInt(50);
					const senderBalance = defaultEscrowAccountInitializationFee + amount * BigInt(2);

					command['_escrowFeeTokenID'] = commonTokenID;

					const sufficientBalanceContext = createTransactionContextWithOverridingParams({
						amount,
						tokenID: commonTokenID,
					});

					jest
						.spyOn(interoperabilityMethod, 'getMessageFeeTokenID')
						.mockResolvedValue(commonTokenID);

					await userStore.save(
						sufficientBalanceContext.createCommandExecuteContext<Params>(
							crossChainTransferParamsSchema,
						),
						sufficientBalanceContext.transaction.senderAddress,
						commonTokenID,
						{
							availableBalance: senderBalance,
							lockedBalances: [],
						},
					);

					const verificationResult = await command.verify(
						sufficientBalanceContext.createCommandVerifyContext(crossChainTransferParamsSchema),
					);

					expect(verificationResult.status).toBe(VerifyStatus.OK);
				});
			});

			describe('when params.tokenID is equal to configured escrowFeeTokenID', () => {
				it('should fail when sender balance is less than the sum of amount and escrowInitializationFee', async () => {
					const userStore = module.stores.get(UserStore);
					const commonTokenID = Buffer.concat([defaultOwnChainID, Buffer.from([0, 0, 0, 0])]);
					const amount = BigInt(50);
					const senderBalance = defaultEscrowAccountInitializationFee + amount - BigInt(1);

					command['_escrowFeeTokenID'] = commonTokenID;

					const insufficientBalanceContext = createTransactionContextWithOverridingParams({
						amount,
						tokenID: commonTokenID,
					});

					jest
						.spyOn(interoperabilityMethod, 'getMessageFeeTokenID')
						.mockResolvedValue(defaultEscrowFeeTokenId);

					await userStore.save(
						insufficientBalanceContext.createCommandExecuteContext<Params>(
							crossChainTransferParamsSchema,
						),
						insufficientBalanceContext.transaction.senderAddress,
						commonTokenID,
						{
							availableBalance: senderBalance,
							lockedBalances: [],
						},
					);

					await userStore.save(
						insufficientBalanceContext.createCommandExecuteContext<Params>(
							crossChainTransferParamsSchema,
						),
						insufficientBalanceContext.transaction.senderAddress,
						defaultEscrowFeeTokenId,
						{
							availableBalance: amount,
							lockedBalances: [],
						},
					);

					expectSchemaValidationError(
						await command.verify(
							insufficientBalanceContext.createCommandVerifyContext(crossChainTransferParamsSchema),
						),
						createInsufficientBalanceError(
							insufficientBalanceContext.transaction.senderAddress,
							senderBalance,
							commonTokenID,
							amount + defaultEscrowAccountInitializationFee,
						),
					);
				});

				it('should pass when sender has sufficient balance; amount and escrowInitializationFee for params.tokenID and amount for messageFeeTokenID ', async () => {
					const userStore = module.stores.get(UserStore);
					const commonTokenID = Buffer.concat([defaultOwnChainID, Buffer.from([0, 0, 0, 0])]);
					const amount = BigInt(50);
					const senderBalance = defaultEscrowAccountInitializationFee + amount;

					command['_escrowFeeTokenID'] = commonTokenID;

					const sufficientBalanceContext = createTransactionContextWithOverridingParams({
						amount,
						tokenID: commonTokenID,
					});

					jest
						.spyOn(interoperabilityMethod, 'getMessageFeeTokenID')
						.mockResolvedValue(defaultEscrowFeeTokenId);

					await userStore.save(
						sufficientBalanceContext.createCommandExecuteContext<Params>(
							crossChainTransferParamsSchema,
						),
						sufficientBalanceContext.transaction.senderAddress,
						commonTokenID,
						{
							availableBalance: senderBalance,
							lockedBalances: [],
						},
					);

					await userStore.save(
						sufficientBalanceContext.createCommandExecuteContext<Params>(
							crossChainTransferParamsSchema,
						),
						sufficientBalanceContext.transaction.senderAddress,
						defaultEscrowFeeTokenId,
						{
							availableBalance: amount,
							lockedBalances: [],
						},
					);

					const verificationResult = await command.verify(
						sufficientBalanceContext.createCommandVerifyContext(crossChainTransferParamsSchema),
					);

					expect(verificationResult.status).toBe(VerifyStatus.OK);
				});
			});
		});

		it('should fail when sender balance is insufficient for params.tokenID', async () => {
			const userStore = module.stores.get(UserStore);
			const amount = BigInt(50);
			const senderBalance = BigInt(49);

			const tokenID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
			const messageFeeTokenID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]);

			const insufficientBalanceContext = createTransactionContextWithOverridingParams({
				amount,
				tokenID,
			});

			jest
				.spyOn(interoperabilityMethod, 'getMessageFeeTokenID')
				.mockResolvedValue(messageFeeTokenID);

			await userStore.save(
				insufficientBalanceContext.createCommandExecuteContext<Params>(
					crossChainTransferParamsSchema,
				),
				insufficientBalanceContext.transaction.senderAddress,
				tokenID,
				{
					availableBalance: senderBalance,
					lockedBalances: [],
				},
			);

			await userStore.save(
				insufficientBalanceContext.createCommandExecuteContext<Params>(
					crossChainTransferParamsSchema,
				),
				insufficientBalanceContext.transaction.senderAddress,
				messageFeeTokenID,
				{
					availableBalance: amount,
					lockedBalances: [],
				},
			);

			expectSchemaValidationError(
				await command.verify(
					insufficientBalanceContext.createCommandVerifyContext(crossChainTransferParamsSchema),
				),
				createInsufficientBalanceError(
					insufficientBalanceContext.transaction.senderAddress,
					senderBalance,
					tokenID,
					amount,
				),
			);
		});

		it('should fail when sender balance is insufficient for messageFeeTokenID', async () => {
			const userStore = module.stores.get(UserStore);
			const amount = BigInt(50);
			const senderBalance = BigInt(49);

			const tokenID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
			const messageFeeTokenID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]);

			const insufficientBalanceContext = createTransactionContextWithOverridingParams({
				amount,
				tokenID,
			});

			jest
				.spyOn(interoperabilityMethod, 'getMessageFeeTokenID')
				.mockResolvedValue(messageFeeTokenID);

			await userStore.save(
				insufficientBalanceContext.createCommandExecuteContext<Params>(
					crossChainTransferParamsSchema,
				),
				insufficientBalanceContext.transaction.senderAddress,
				tokenID,
				{
					availableBalance: amount,
					lockedBalances: [],
				},
			);

			await userStore.save(
				insufficientBalanceContext.createCommandExecuteContext<Params>(
					crossChainTransferParamsSchema,
				),
				insufficientBalanceContext.transaction.senderAddress,
				messageFeeTokenID,
				{
					availableBalance: senderBalance,
					lockedBalances: [],
				},
			);

			expectSchemaValidationError(
				await command.verify(
					insufficientBalanceContext.createCommandVerifyContext(crossChainTransferParamsSchema),
				),
				createInsufficientBalanceError(
					insufficientBalanceContext.transaction.senderAddress,
					senderBalance,
					messageFeeTokenID,
					amount,
				),
			);
		});
	});

	describe('execute', () => {
		beforeAll(() => {
			validParams = {
				tokenID: defaultTokenID,
				amount: BigInt(100000000),
				receivingChainID: defaultReceivingChainID,
				recipientAddress: utils.getRandomBytes(20),
				data: '1'.repeat(64),
				messageFee: BigInt(1000),
				escrowInitializationFee: defaultEscrowAccountInitializationFee,
			};
		});

		describe('when chainID of tokenID is equal to ownChainID and escrowAccount does not exist', () => {
			it('should create escrowAccount for receivingChainID and tokenID, burn the escrowInitializationFee for sender address and logs InitializeEscrowAccountEvent and TransferCrossChainEvent and call InteroperabilityMethod#send', async () => {
				const userStore = module.stores.get(UserStore);
				const escrowStore = module.stores.get(EscrowStore);

				const commonTokenID = Buffer.concat([defaultOwnChainID, Buffer.from([0, 0, 0, 0])]);
				const amount = BigInt(50);
				const senderBalance = defaultEscrowAccountInitializationFee + amount * BigInt(2);

				command['_escrowFeeTokenID'] = commonTokenID;

				const context = createTransactionContextWithOverridingParams({
					amount,
					tokenID: commonTokenID,
				});

				jest.spyOn(interoperabilityMethod, 'getMessageFeeTokenID').mockResolvedValue(commonTokenID);

				jest.spyOn(method, 'burn').mockImplementation(async () => Promise.resolve());

				await userStore.save(
					context.createCommandExecuteContext<Params>(crossChainTransferParamsSchema),
					context.transaction.senderAddress,
					commonTokenID,
					{
						availableBalance: senderBalance,
						lockedBalances: [],
					},
				);

				const commandExecuteContext = context.createCommandExecuteContext<Params>(
					crossChainTransferParamsSchema,
				);

				await command.execute(commandExecuteContext);

				const escrowAccount = await escrowStore.get(
					context.createCommandVerifyContext(),
					escrowStore.getKey(validParams.receivingChainID, commonTokenID),
				);

				expect(escrowAccount.amount).toBe(BigInt(0));

				expect(method.burn).toBeCalledTimes(1);
				expect(method.burn).toHaveBeenCalledWith(
					commandExecuteContext.getMethodContext(),
					commandExecuteContext.transaction.senderAddress,
					commonTokenID,
					defaultEscrowAccountInitializationFee,
				);

				checkEventResult(commandExecuteContext.eventQueue, 2, InitializeEscrowAccountEvent, 0, {
					chainID: validParams.receivingChainID,
					tokenID: commonTokenID,
					initPayingAddress: context.transaction.senderAddress,
					initializationFee: command['_escrowInitializationFee'],
				});

				checkEventResult(commandExecuteContext.eventQueue, 2, TransferCrossChainEvent, 1, {
					senderAddress: commandExecuteContext.transaction.senderAddress,
					receivingChainID: validParams.receivingChainID,
					tokenID: commonTokenID,
					amount,
					recipientAddress: validParams.recipientAddress,
				});

				expect(interoperabilityMethod.send).toHaveBeenCalledTimes(1);
				expect(interoperabilityMethod.send).toHaveBeenCalledWith(
					commandExecuteContext.getMethodContext(),
					context.transaction.senderAddress,
					module.name,
					CROSS_CHAIN_COMMAND_NAME_TRANSFER,
					validParams.receivingChainID,
					validParams.messageFee,
					CCM_STATUS_OK,
					codec.encode(crossChainTransferParamsSchema, {
						...validParams,
						amount,
						tokenID: commonTokenID,
					}),
				);
			});
		});

		it('should log TransferCrossChainEvent and call InteroperabilityMethod#send', async () => {
			const userStore = module.stores.get(UserStore);

			const commonTokenID = Buffer.concat([Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])]);
			const amount = BigInt(50);
			const senderBalance = defaultEscrowAccountInitializationFee + amount * BigInt(2);

			command['_escrowFeeTokenID'] = commonTokenID;

			const context = createTransactionContextWithOverridingParams({
				amount,
				tokenID: commonTokenID,
			});

			jest.spyOn(interoperabilityMethod, 'getMessageFeeTokenID').mockResolvedValue(commonTokenID);

			jest.spyOn(method, 'burn').mockImplementation(async () => Promise.resolve());

			await userStore.save(
				context.createCommandExecuteContext<Params>(crossChainTransferParamsSchema),
				context.transaction.senderAddress,
				commonTokenID,
				{
					availableBalance: senderBalance,
					lockedBalances: [],
				},
			);

			const commandExecuteContext = context.createCommandExecuteContext<Params>(
				crossChainTransferParamsSchema,
			);

			await command.execute(commandExecuteContext);

			expect(method.burn).toBeCalledTimes(0);

			checkEventResult(commandExecuteContext.eventQueue, 1, TransferCrossChainEvent, 0, {
				senderAddress: commandExecuteContext.transaction.senderAddress,
				receivingChainID: validParams.receivingChainID,
				tokenID: commonTokenID,
				amount,
				recipientAddress: validParams.recipientAddress,
			});

			expect(interoperabilityMethod.send).toHaveBeenCalledTimes(1);
			expect(interoperabilityMethod.send).toHaveBeenCalledWith(
				commandExecuteContext.getMethodContext(),
				context.transaction.senderAddress,
				module.name,
				CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				validParams.receivingChainID,
				validParams.messageFee,
				CCM_STATUS_OK,
				codec.encode(crossChainTransferParamsSchema, {
					...validParams,
					amount,
					tokenID: commonTokenID,
				}),
			);
		});

		it('should fail when sender balance is not sufficient', async () => {
			const userStore = module.stores.get(UserStore);

			const commonTokenID = Buffer.concat([Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])]);
			const amount = BigInt(50);
			const senderBalance = amount - BigInt(1);

			command['_escrowFeeTokenID'] = commonTokenID;

			const context = createTransactionContextWithOverridingParams({
				amount,
				tokenID: commonTokenID,
			});

			jest.spyOn(interoperabilityMethod, 'getMessageFeeTokenID').mockResolvedValue(commonTokenID);

			await userStore.save(
				context.createCommandExecuteContext<Params>(crossChainTransferParamsSchema),
				context.transaction.senderAddress,
				commonTokenID,
				{
					availableBalance: senderBalance,
					lockedBalances: [],
				},
			);

			const commandExecuteContext = context.createCommandExecuteContext<Params>(
				crossChainTransferParamsSchema,
			);

			await expect(command.execute(commandExecuteContext)).rejects.toThrow(
				createInsufficientBalanceError(
					context.transaction.senderAddress,
					senderBalance,
					commonTokenID,
					amount,
				),
			);
		});
	});
});
