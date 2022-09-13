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

import { utils } from '@liskhq/lisk-cryptography';
import { DPoSMethod } from '../../../../src/modules/dpos_v2/method';
import { MethodContext } from '../../../../src/state_machine/method_context';
import { EventQueue } from '../../../../src/state_machine';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { DPoSModule } from '../../../../src/modules/dpos_v2/module';
import { VoterStore } from '../../../../src/modules/dpos_v2/stores/voter';
import { DelegateStore } from '../../../../src/modules/dpos_v2/stores/delegate';
import { NameStore } from '../../../../src/modules/dpos_v2/stores/name';
import { createStoreGetter } from '../../../../src/testing/utils';

describe('DposModuleApi', () => {
	const dpos = new DPoSModule();

	let dposMethod: DPoSMethod;
	let methodContext: MethodContext;
	let stateStore: PrefixedStateReadWriter;
	let voterSubStore: VoterStore;
	let delegateSubStore: DelegateStore;
	let nameSubStore: NameStore;
	const address = utils.getRandomBytes(20);
	const voterData = {
		sentVotes: [
			{
				delegateAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
			},
		],
		pendingUnlocks: [
			{
				delegateAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
				unvoteHeight: 0,
			},
		],
	};

	const delegateData = {
		name: 'delegate1',
		totalVotesReceived: BigInt(0),
		selfVotes: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [0],
		consecutiveMissedBlocks: 0,
	};

	beforeEach(() => {
		dposMethod = new DPoSMethod(dpos.stores, dpos.events);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		voterSubStore = dpos.stores.get(VoterStore);
		delegateSubStore = dpos.stores.get(DelegateStore);
		nameSubStore = dpos.stores.get(NameStore);
		methodContext = new MethodContext({ stateStore, eventQueue: new EventQueue(0) });
	});

	describe('isNameAvailable', () => {
		describe('when name already exists', () => {
			it('should return false', async () => {
				await nameSubStore.set(createStoreGetter(stateStore), Buffer.from(delegateData.name), {
					delegateAddress: Buffer.alloc(0),
				});
				await expect(
					dposMethod.isNameAvailable(methodContext, delegateData.name),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and exceeds the maximum length', () => {
			it('should return false', async () => {
				await expect(
					dposMethod.isNameAvailable(
						methodContext,
						'nnwkfnwkfnkwrnfkrnfeknekerfnkjenejnfekfnekfnjkdnwknw',
					),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and has length less than 1', () => {
			it('should return false', async () => {
				await expect(dposMethod.isNameAvailable(methodContext, '')).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and contains invalid symbol', () => {
			it('should return false', async () => {
				await expect(
					dposMethod.isNameAvailable(methodContext, 'Ajldnfdf-_.dv$%&^#'),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and is a valid name', () => {
			it('should return true', async () => {
				await expect(
					dposMethod.isNameAvailable(methodContext, 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.'),
				).resolves.toBeFalse();
			});
		});
	});

	describe('getVoter', () => {
		describe('when input address is valid', () => {
			it('should return correct voter data corresponding to the input address', async () => {
				await voterSubStore.set(createStoreGetter(stateStore), address, voterData);
				const voterDataReturned = await dposMethod.getVoter(methodContext, address);

				expect(voterDataReturned).toStrictEqual(voterData);
			});
		});
	});

	describe('getDelegate', () => {
		describe('when input address is valid', () => {
			it('should return correct delegate data corresponding to the input address', async () => {
				await delegateSubStore.set(createStoreGetter(stateStore), address, delegateData);
				const delegateDataReturned = await dposMethod.getDelegate(methodContext, address);

				expect(delegateDataReturned).toStrictEqual(delegateData);
			});
		});
	});
});
