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
/* eslint-disable jest/expect-expect */

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
import { TransferCrossChainCommand } from '../../../../../src/modules/token/commands/transfer_cross_chain';
import {
	CCM_STATUS_OK,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
} from '../../../../../src/modules/token/constants';
import {
	CCTransferMessageParams,
	crossChainTransferMessageParams,
	crossChainTransferParamsSchema,
} from '../../../../../src/modules/token/schemas';
import { EventQueue } from '../../../../../src/state_machine';
import { EscrowStore } from '../../../../../src/modules/token/stores/escrow';
import { UserStore } from '../../../../../src/modules/token/stores/user';
import { createTransactionContext } from '../../../../../src/testing';
import { InitializeEscrowAccountEvent } from '../../../../../src/modules/token/events/initialize_escrow_account';
import { TransferCrossChainEvent } from '../../../../../src/modules/token/events/transfer_cross_chain';
import { InternalMethod } from '../../../../../src/modules/token/internal_method';

interface Params {
	tokenID: Buffer;
	amount: bigint;
	receivingChainID: Buffer;
	recipientAddress: Buffer;
	data: string;
	messageFee: bigint;
	messageFeeTokenID: Buffer;
}

describe('CCTransfer command', () => {
	let command: TransferCrossChainCommand;
	const module = new TokenModule();
	const method = new TokenMethod(module.stores, module.events, module.name);
	const internalMethod = new InternalMethod(module.stores, module.events);

	const defaultOwnChainID = Buffer.from([0, 0, 0, 1]);
	const defaultReceivingChainID = Buffer.from([0, 0, 1, 0]);
	const defaultTokenID = Buffer.concat([defaultOwnChainID, Buffer.alloc(4)]);
	const defaultUserAccountInitializationFee = BigInt('50000000');
	const defaultEscrowAccountInitializationFee = BigInt('50000000');

	let validParams: Params;

	const createTransactionContextWithOverridingParams = (params: Record<string, unknown>) =>
		createTransactionContext({
			chainID: defaultOwnChainID,
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
		availableBalance: bigint,
		tokenID: Buffer,
		amount: bigint,
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

	beforeEach(() => {
		command = new TransferCrossChainCommand(module.stores, module.events);

		interoperabilityMethod = {
			getOwnChainAccount: jest.fn().mockResolvedValue({ id: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn(),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
			getMessageFeeTokenID: jest.fn(),
		};
		internalMethod.addDependencies({
			payFee: jest.fn(),
		});
		internalMethod.init({
			escrowAccountInitializationFee: defaultEscrowAccountInitializationFee,
			userAccountInitializationFee: defaultUserAccountInitializationFee,
		});

		method.addDependencies(interoperabilityMethod, internalMethod);

		method.init({
			ownChainID: defaultOwnChainID,
			escrowAccountInitializationFee: defaultEscrowAccountInitializationFee,
			userAccountInitializationFee: defaultUserAccountInitializationFee,
		});

		command.init({
			moduleName: module.name,
			method,
			interoperabilityMethod,
			internalMethod,
		});

		jest.spyOn(command['_internalMethod'], 'initializeEscrowAccount');
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
				messageFeeTokenID: defaultTokenID,
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

		it('should fail when messageFeeTokenID does not have valid length', async () => {
			const messageFeeTokenIDMinLengthContext = createTransactionContextWithOverridingParams({
				messageFeeTokenID: Buffer.from('00', 'hex'),
			});

			const messageFeeTokenIDMaxLengthContext = createTransactionContextWithOverridingParams({
				messageFeeTokenID: Buffer.from('00000000000000000000000000', 'hex'),
			});

			expectSchemaValidationError(
				await command.verify(
					messageFeeTokenIDMinLengthContext.createCommandExecuteContext(
						crossChainTransferParamsSchema,
					),
				),
				"'.messageFeeTokenID' minLength not satisfied",
			);

			expectSchemaValidationError(
				await command.verify(
					messageFeeTokenIDMaxLengthContext.createCommandVerifyContext(
						crossChainTransferParamsSchema,
					),
				),
				"'.messageFeeTokenID' maxLength exceeded",
			);
		});

		it('should fail when chainID of the tokenID is other than ownChainID or receivingChainID', async () => {
			const invalidtokenChainIDContext = createTransactionContextWithOverridingParams({
				tokenID: Buffer.from([0, 0, 1, 1, 0, 0, 0, 0]),
			});

			expectSchemaValidationError(
				await command.verify(
					invalidtokenChainIDContext.createCommandExecuteContext(crossChainTransferParamsSchema),
				),
				'Token must be native to either the sending or the receiving chain.',
			);
		});

		it('should fail when chainID of the tokenID is mainchain token ID', async () => {
			const invalidtokenChainIDContext = createTransactionContextWithOverridingParams({
				tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
			});

			expectSchemaValidationError(
				await command.verify(
					invalidtokenChainIDContext.createCommandExecuteContext(crossChainTransferParamsSchema),
				),
				'Token must be native to either the sending or the receiving chain.',
			);
		});

		it('should fail when sender balance is insufficient for params.tokenID', async () => {
			const userStore = module.stores.get(UserStore);
			const amount = BigInt(50);
			const senderBalance = BigInt(49);

			const tokenID = Buffer.concat([defaultOwnChainID, Buffer.from([0, 0, 0, 0])]);
			const messageFeeTokenID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]);

			const insufficientBalanceContext = createTransactionContextWithOverridingParams({
				amount,
				tokenID,
				messageFeeTokenID,
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

			const tokenID = Buffer.concat([defaultOwnChainID, Buffer.from([0, 0, 0, 0])]);
			const messageFeeTokenID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]);

			const insufficientBalanceContext = createTransactionContextWithOverridingParams({
				amount,
				tokenID,
				messageFeeTokenID,
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

		it('should fail when receivingChainID is own chainID', async () => {
			const transactionContext = createTransactionContextWithOverridingParams({
				receivingChainID: defaultOwnChainID,
			});

			expectSchemaValidationError(
				await command.verify(
					transactionContext.createCommandVerifyContext(crossChainTransferParamsSchema),
				),
				'Receiving chain cannot be the sending chain.',
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
				messageFeeTokenID: defaultTokenID,
			};
		});

		describe('when chainID of tokenID is equal to ownChainID and escrowAccount does not exist', () => {
			it('should create and add amount to escrowAccount for receivingChainID and tokenID and logs InitializeEscrowAccountEvent and TransferCrossChainEvent and call InteroperabilityMethod#send', async () => {
				const userStore = module.stores.get(UserStore);
				const escrowStore = module.stores.get(EscrowStore);

				const commonTokenID = Buffer.concat([defaultOwnChainID, Buffer.from([0, 0, 0, 0])]);
				const amount = BigInt(50);
				const senderBalance = defaultEscrowAccountInitializationFee + amount * BigInt(2);

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

				await command.execute(commandExecuteContext);

				const escrowAccount = await escrowStore.get(
					context.createCommandVerifyContext(),
					escrowStore.getKey(validParams.receivingChainID, commonTokenID),
				);

				expect(escrowAccount.amount).toBe(BigInt(50));

				expect(command['_internalMethod'].initializeEscrowAccount).toHaveBeenCalledWith(
					expect.anything(),
					validParams.receivingChainID,
					validParams.tokenID,
				);

				checkEventResult(commandExecuteContext.eventQueue, 2, InitializeEscrowAccountEvent, 0, {
					chainID: validParams.receivingChainID,
					tokenID: commonTokenID,
					initializationFee: defaultEscrowAccountInitializationFee,
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
					codec.encode(crossChainTransferMessageParams, {
						tokenID: commonTokenID,
						amount,
						senderAddress: context.transaction.senderAddress,
						recipientAddress: validParams.recipientAddress,
						data: validParams.data,
					} as CCTransferMessageParams),
					commandExecuteContext.header.timestamp,
				);
			});
		});

		it('should log TransferCrossChainEvent and call InteroperabilityMethod#send', async () => {
			const userStore = module.stores.get(UserStore);

			const commonTokenID = Buffer.concat([Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])]);
			const amount = BigInt(50);
			const senderBalance = defaultEscrowAccountInitializationFee + amount * BigInt(2);

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

			await command.execute(commandExecuteContext);

			expect(command['_internalMethod'].initializeEscrowAccount).not.toHaveBeenCalled();

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
				codec.encode(crossChainTransferMessageParams, {
					tokenID: commonTokenID,
					amount,
					senderAddress: context.transaction.senderAddress,
					recipientAddress: validParams.recipientAddress,
					data: validParams.data,
				} as CCTransferMessageParams),
				commandExecuteContext.header.timestamp,
			);
		});

		it('should fail when sender balance is not sufficient', async () => {
			const userStore = module.stores.get(UserStore);

			const commonTokenID = Buffer.concat([Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])]);
			const amount = BigInt(50);
			const senderBalance = amount - BigInt(1);

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
