/*
 * Copyright © 2020 Lisk Foundation
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

import { calculateDiff, undo } from '../../src/diff';

describe('diff', () => {
	describe('calculateDiff', () => {
		describe('Testing using simple arrays', () => {
			const arr1 = [1, 2, 3, 5, 6];
			const arr2 = [1, 3, 4, 5, 6];
			const arr1Buffer = Buffer.from(arr1);
			const arr2Buffer = Buffer.from(arr2);

			it('should return an array of edit history', () => {
				const diff = calculateDiff(arr1Buffer, arr2Buffer);
				const editHistory = [
					['=', 1],
					['-', 2],
					['=', 1],
					['+', 4],
					['=', 2],
				];
				expect(diff).toEqual(editHistory);
				expect(undo(arr2Buffer, diff)).toEqual(arr1Buffer);
			});

			it('should return history with only "=" operation equal to the number of values', () => {
				const diff = calculateDiff(arr1Buffer, arr1Buffer);
				const editHistory = [['=', 5]];
				expect(diff).toEqual(editHistory);
				expect(undo(arr1Buffer, diff)).toEqual(arr1Buffer);
			});

			it('should return history with "+" operators adding each new element of the new array', () => {
				const diff = calculateDiff(Buffer.from([]), arr1Buffer);
				const editHistory = [
					['+', 1],
					['+', 2],
					['+', 3],
					['+', 5],
					['+', 6],
				];
				expect(diff).toEqual(editHistory);
				expect(undo(arr1Buffer, diff)).toEqual(Buffer.from([]));
			});
		});

		describe('Testing using account states', () => {
			const transferTransaction = {
				id: '15598937801017721882',
				height: 1,
				blockId: '1349213844499460766',
				type: 8,
				nonce: '1',
				senderPublicKey:
					'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
				senderId: '5059876081639179984L',
				fee: '0',
				signatures: [
					'0886f6538f68d40f61b42ae4b248be99ccb700a985727251adbbb5b90a358cd1675447942b3016e75537954d4b108e301b8da6512d86b6c36eea8adc94e57700',
				],
				asset: {
					amount: 1000000000000,
					recipientId: '8531579280410192796L',
				},
			};

			const senderAccount = {
				address: '5059876081639179984L',
				publicKey:
					'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
				username: null,
				isDelegate: false,
				nonce: '103',
				balance: 9897000000000000,
				fees: '0',
				rewards: '0',
			};

			const receiverAccount = {
				address: '8531579280410192796L',
				publicKey:
					'508a965871253595b36e2f8dc27bff6e67b39bdd466531be9c6f8c401253979c',
				username: 'genesis_1',
				isDelegate: true,
				nonce: '2',
				balance: 0,
				fees: '0',
				rewards: '0',
			};

			let previousSenderState: any;
			let previousSenderStateBuffer: Buffer;
			let previousReceiverState: any;
			let previousReceiverStateBuffer: Buffer;

			beforeEach(() => {
				previousSenderState = { ...senderAccount };
				previousSenderStateBuffer = Buffer.from(JSON.stringify(senderAccount));
				previousReceiverState = { ...receiverAccount };
				previousReceiverStateBuffer = Buffer.from(
					JSON.stringify(receiverAccount),
				);
			});

			it('should return senders/receiver account state back to previous state', () => {
				// Transfer from sender and calculate account state diff of sender
				previousSenderState.balance -= transferTransaction.asset.amount;
				const currentSenderStateBuffer = Buffer.from(
					JSON.stringify(previousSenderState),
				);
				const senderDiff = calculateDiff(
					previousSenderStateBuffer,
					currentSenderStateBuffer,
				);

				const restoredSender = JSON.parse(
					undo(currentSenderStateBuffer, senderDiff).toString('utf8'),
				);

				expect(restoredSender).toEqual(senderAccount);

				// Receiver from sender and calculate account state diff of receiver
				previousReceiverState.balance += transferTransaction.asset.amount;

				const currentReceiverStateBuffer = Buffer.from(
					JSON.stringify(previousReceiverState),
				);

				const receiverDiff = calculateDiff(
					previousReceiverStateBuffer,
					currentReceiverStateBuffer,
				);

				const restoredReceiver = JSON.parse(
					undo(currentReceiverStateBuffer, receiverDiff).toString('utf8'),
				);

				expect(restoredReceiver).toEqual(receiverAccount);
			});
		});
	});
});
