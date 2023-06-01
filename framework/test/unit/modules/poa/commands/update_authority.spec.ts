import { address, bls, utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { TransactionAttrs } from '@liskhq/lisk-chain';
import { MAX_UINT64 } from '@liskhq/lisk-validator';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	PoAModule,
	Transaction,
	VerifyStatus,
} from '../../../../../src';
import { UpdateAuthorityCommand } from '../../../../../src/modules/poa/commands/update_authority';
import {
	UpdateAuthorityValidatorParams,
	ValidatorsMethod,
} from '../../../../../src/modules/poa/types';
import {
	AUTHORITY_REGISTRATION_FEE,
	COMMAND_UPDATE_AUTHORITY,
	EMPTY_BYTES,
	MAX_NUM_VALIDATORS,
	MODULE_NAME_POA,
	UpdateAuthority,
} from '../../../../../src/modules/poa/constants';
import { updateAuthorityValidatorSchema } from '../../../../../src/modules/poa/schemas';
import * as testing from '../../../../../src/testing';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import {
	ChainPropertiesStore,
	SnapshotStore,
	ValidatorStore,
} from '../../../../../src/modules/poa/stores';
import { createStoreGetter } from '../../../../../src/testing/utils';
import { AuthorityUpdateEvent } from '../../../../../src/modules/poa/events/authority_update';
import { EventQueue } from '../../../../../src/state_machine';

describe('UpdateAuthority', () => {
	const poaModule = new PoAModule();
	let updateAuthorityCommand: UpdateAuthorityCommand;
	let mockValidatorsMethod: ValidatorsMethod;
	let stateStore: PrefixedStateReadWriter;
	let validatorStore: ValidatorStore;
	let chainPropertiesStore: ChainPropertiesStore;
	let snapshotStore: SnapshotStore;

	const validator0 = Buffer.from('0000000000000000000000000000000000000000', 'hex');
	const validator1 = Buffer.from('0000000000000000000000000000000000000001', 'hex');
	const validator2 = Buffer.from('0000000000000000000000000000000000000002', 'hex');

	const updateAuthorityValidatorParams: UpdateAuthorityValidatorParams = {
		newValidators: [
			{
				address: validator0,
				weight: BigInt(40),
			},
			{
				address: validator1,
				weight: BigInt(40),
			},
		],
		threshold: BigInt(68),
		validatorsUpdateNonce: 0,
		signature: utils.getRandomBytes(64),
		aggregationBits: Buffer.from([0]),
	};

	const buildUpdateAuthorityValidatorParams = (
		params: Partial<UpdateAuthorityValidatorParams>,
	): Buffer =>
		codec.encode(updateAuthorityValidatorSchema, {
			newValidators: params.newValidators ?? updateAuthorityValidatorParams.newValidators,
			threshold: params.threshold ?? updateAuthorityValidatorParams.threshold,
			validatorsUpdateNonce:
				params.validatorsUpdateNonce ?? updateAuthorityValidatorParams.validatorsUpdateNonce,
			signature: params.signature ?? updateAuthorityValidatorParams.signature,
			aggregationBits: params.aggregationBits ?? updateAuthorityValidatorParams.aggregationBits,
		});

	const publicKey = utils.getRandomBytes(32);
	const chainID = Buffer.from([0, 0, 0, 1]);

	const buildTransaction = (transaction: Partial<TransactionAttrs>): Transaction => {
		return new Transaction({
			module: transaction.module ?? MODULE_NAME_POA,
			command: transaction.command ?? COMMAND_UPDATE_AUTHORITY,
			senderPublicKey: transaction.senderPublicKey ?? publicKey,
			nonce: transaction.nonce ?? BigInt(0),
			fee: transaction.fee ?? AUTHORITY_REGISTRATION_FEE,
			params:
				transaction.params ??
				codec.encode(updateAuthorityValidatorSchema, updateAuthorityValidatorParams),
			signatures: transaction.signatures ?? [publicKey],
		});
	};

	beforeEach(async () => {
		updateAuthorityCommand = new UpdateAuthorityCommand(poaModule.stores, poaModule.events);
		mockValidatorsMethod = {
			setValidatorGeneratorKey: jest.fn(),
			registerValidatorKeys: jest.fn(),
			registerValidatorWithoutBLSKey: jest.fn(),
			getValidatorKeys: jest.fn(),
			getGeneratorsBetweenTimestamps: jest.fn(),
			setValidatorsParams: jest.fn(),
		};
		updateAuthorityCommand.addDependencies(mockValidatorsMethod);

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		validatorStore = poaModule.stores.get(ValidatorStore);
		chainPropertiesStore = poaModule.stores.get(ChainPropertiesStore);
		snapshotStore = poaModule.stores.get(SnapshotStore);

		await validatorStore.set(createStoreGetter(stateStore), validator0, {
			name: 'validator0',
		});
		await validatorStore.set(createStoreGetter(stateStore), validator1, {
			name: 'validator1',
		});
		await chainPropertiesStore.set(createStoreGetter(stateStore), EMPTY_BYTES, {
			roundEndHeight: 0,
			validatorsUpdateNonce: 0,
		});
	});

	describe('verify', () => {
		let context: CommandVerifyContext<UpdateAuthorityValidatorParams>;
		beforeEach(() => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({}),
					chainID,
				})
				.createCommandVerifyContext<UpdateAuthorityValidatorParams>(updateAuthorityValidatorSchema);
		});

		it('should return error when length of newValidators less than 1', async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({
						params: buildUpdateAuthorityValidatorParams({
							newValidators: [],
						}),
					}),
					chainID,
				})
				.createCommandVerifyContext<UpdateAuthorityValidatorParams>(updateAuthorityValidatorSchema);

			await expect(updateAuthorityCommand.verify(context)).rejects.toThrow(
				'Invalid number of newValidators.',
			);
		});

		it('should return error when length of newValidators greater than MAX_NUM_VALIDATORS', async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({
						params: buildUpdateAuthorityValidatorParams({
							newValidators: Array.from(Array(MAX_NUM_VALIDATORS + 1).keys()).map(_ => ({
								address: utils.getRandomBytes(20),
								weight: BigInt(1),
							})),
						}),
					}),
					chainID,
				})
				.createCommandVerifyContext<UpdateAuthorityValidatorParams>(updateAuthorityValidatorSchema);

			await expect(updateAuthorityCommand.verify(context)).rejects.toThrow(
				'Invalid number of newValidators.',
			);
		});

		it('should return error when newValidators are not lexicographically ordered', async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({
						params: buildUpdateAuthorityValidatorParams({
							newValidators: [
								{
									address: validator1,
									weight: BigInt(1),
								},
								{
									address: validator0,
									weight: BigInt(1),
								},
							],
						}),
					}),
					chainID,
				})
				.createCommandVerifyContext<UpdateAuthorityValidatorParams>(updateAuthorityValidatorSchema);

			await expect(updateAuthorityCommand.verify(context)).rejects.toThrow(
				'Addresses in newValidators are not lexicographical ordered.',
			);
		});

		it('should return error when validator not in ValidatorStore', async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({
						params: buildUpdateAuthorityValidatorParams({
							newValidators: [
								...updateAuthorityValidatorParams.newValidators,
								{
									address: validator2,
									weight: BigInt(2),
								},
							],
						}),
					}),
					chainID,
				})
				.createCommandVerifyContext<UpdateAuthorityValidatorParams>(updateAuthorityValidatorSchema);

			await expect(updateAuthorityCommand.verify(context)).rejects.toThrow(
				`${address.getLisk32AddressFromPublicKey(validator2)} is not a valid validator.`,
			);
		});

		it('should return error when totalWeight greater than MAX_UINT64', async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({
						params: buildUpdateAuthorityValidatorParams({
							newValidators: [
								{
									address: validator0,
									weight: BigInt(MAX_UINT64),
								},
								{
									address: validator1,
									weight: BigInt(1),
								},
							],
						}),
					}),
					chainID,
				})
				.createCommandVerifyContext<UpdateAuthorityValidatorParams>(updateAuthorityValidatorSchema);

			await expect(updateAuthorityCommand.verify(context)).rejects.toThrow(
				'TotalWeight out of range.',
			);
		});

		it('should return error when trsParams.threshold less than (totalWeight / 3) + 1 ', async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({
						params: buildUpdateAuthorityValidatorParams({
							threshold: BigInt(20),
						}),
					}),
					chainID,
				})
				.createCommandVerifyContext<UpdateAuthorityValidatorParams>(updateAuthorityValidatorSchema);

			await expect(updateAuthorityCommand.verify(context)).rejects.toThrow('Invalid threshold.');
		});

		it('should return error when trsParams.threshold greater than totalWeight', async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({
						params: buildUpdateAuthorityValidatorParams({
							threshold: BigInt(81),
						}),
					}),
					chainID,
				})
				.createCommandVerifyContext<UpdateAuthorityValidatorParams>(updateAuthorityValidatorSchema);

			await expect(updateAuthorityCommand.verify(context)).rejects.toThrow('Invalid threshold.');
		});

		it('should return error when trsParams.validatorsUpdateNonce not equal to chainProperties.validatorsUpdateNonce', async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({
						params: buildUpdateAuthorityValidatorParams({
							validatorsUpdateNonce: 1,
						}),
					}),
					chainID,
				})
				.createCommandVerifyContext<UpdateAuthorityValidatorParams>(updateAuthorityValidatorSchema);

			await expect(updateAuthorityCommand.verify(context)).rejects.toThrow(
				'Invalid validatorsUpdateNonce.',
			);
		});

		it('should return OK when transaction is valid', async () => {
			const result = await updateAuthorityCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});
	});

	describe('execute', () => {
		let context: CommandExecuteContext<UpdateAuthorityValidatorParams>;

		const checkEventResult = (
			eventQueue: EventQueue,
			BaseEvent: any,
			expectedResult: UpdateAuthority,
			length = 1,
			index = 0,
		) => {
			expect(eventQueue.getEvents()).toHaveLength(length);
			expect(eventQueue.getEvents()[index].toObject().name).toEqual(new BaseEvent('token').name);
			expect(
				codec.decode<Record<string, unknown>>(
					new BaseEvent('token').schema,
					eventQueue.getEvents()[index].toObject().data,
				).result,
			).toEqual(expectedResult);
		};
		beforeEach(async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({}),
					chainID,
				})
				.createCommandExecuteContext<UpdateAuthorityValidatorParams>(
					updateAuthorityValidatorSchema,
				);

			await snapshotStore.set(createStoreGetter(stateStore), Buffer.from([0]), {
				validators: [],
				threshold: BigInt(0),
			});
		});

		it('should return error and emit event when verifyWeightedAggSig failed', async () => {
			jest.spyOn(bls, 'verifyWeightedAggSig').mockReturnValue(false);

			await expect(updateAuthorityCommand.execute(context)).rejects.toThrow('Invalid Signature.');

			checkEventResult(
				context.eventQueue,
				AuthorityUpdateEvent,
				UpdateAuthority.FAIL_INVALID_SIGNATURE,
			);
		});

		it('should increase validatorsUpdateNonce and emit event', async () => {
			jest.spyOn(bls, 'verifyWeightedAggSig').mockReturnValue(true);

			await updateAuthorityCommand.execute(context);

			expect(await snapshotStore.get(context, Buffer.from([2]))).toStrictEqual({
				validators: updateAuthorityValidatorParams.newValidators,
				threshold: updateAuthorityValidatorParams.threshold,
			});
			expect(await chainPropertiesStore.get(context, EMPTY_BYTES)).toStrictEqual({
				roundEndHeight: 0,
				validatorsUpdateNonce: 1,
			});

			checkEventResult(context.eventQueue, AuthorityUpdateEvent, UpdateAuthority.SUCCESS);
		});
	});
});
