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
 *
 */
import {
	TransactionList,
	EVENT_TRANSACTION_REMOVED,
} from '../../src/transaction_list';
import { Transaction } from '../../src/types';

const insertNTransactions = (
	transactionList: TransactionList,
	n: number,
	nonceStart: number = 0,
) => {
	const addedTransactions = [];
	for (let i = nonceStart; i < nonceStart + n; i += 1) {
		const tx = {
			id: i.toString(),
			nonce: BigInt(i),
			fee: BigInt(i * 1000),
		} as Transaction;
		addedTransactions.push(tx);
		transactionList.add(tx);
	}
	return addedTransactions;
};

describe('TransactionList class', () => {
	const defaultAddress = '123L';

	let transactionList: TransactionList;

	beforeEach(() => {
		transactionList = new TransactionList(defaultAddress);
	});

	describe('constructor', () => {
		describe('when option are not given', () => {
			it('should set default values', async () => {
				expect((transactionList as any)._maxSize).toEqual(64);
				expect(
					(transactionList as any)._minReplacementFeeDifference.toString(),
				).toEqual('0');
			});
		});

		describe('when option are given', () => {
			it('should set the value to given option values', async () => {
				transactionList = new TransactionList(defaultAddress, {
					maxSize: 10,
					minReplacementFeeDifference: BigInt(100),
				});
				expect((transactionList as any)._maxSize).toEqual(10);
				expect(
					(transactionList as any)._minReplacementFeeDifference.toString(),
				).toEqual('100');
			});
		});
	});

	describe('add', () => {
		beforeEach(async () => {
			transactionList = new TransactionList(defaultAddress, {
				maxSize: 10,
				minReplacementFeeDifference: BigInt(10),
			});
		});

		describe('given list still has spaces', () => {
			describe('when the same nonce transaction with higher fee is added', () => {
				it('should replace with the new transaction', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 5);
					const replacing = {
						...addedTxs[0],
						id: 'new-id',
						fee: addedTxs[0].fee + BigInt(500000000),
					};
					// Act
					const { added, removedID } = transactionList.add(replacing);
					// Assert
					expect(removedID).toEqual(addedTxs[0].id);
					expect(added).toEqual(true);
					expect(transactionList.size).toEqual(5);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual('new-id');
				});

				it('should demote all subsequent transactions', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 5);
					transactionList.promote(addedTxs);
					const replacing = {
						...addedTxs[0],
						id: 'new-id',
						fee: addedTxs[0].fee + BigInt(500000000),
					};
					// Act
					const { added, removedID } = transactionList.add(replacing);
					// Assert
					expect(added).toEqual(true);
					expect(removedID).toEqual(addedTxs[0].id);
					expect(transactionList.size).toEqual(5);
					expect(transactionList.getProcessable()).toHaveLength(0);
					expect(transactionList.getUnprocessable()).toHaveLength(5);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual('new-id');
				});
			});

			describe('when the same nonce transaction with higher fee but lower than minReplaceFeeDiff is added', () => {
				it('should not replace and not add to the list', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 5);
					const replacing = {
						...addedTxs[0],
						id: 'new-id',
						fee: addedTxs[0].fee + BigInt(5),
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toEqual(false);
					expect(transactionList.size).toEqual(5);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(
						addedTxs[0].id,
					);
				});
			});

			describe('when the same nonce transaction with the lower than min replacement fee is added', () => {
				it('should not replace and not add to the list', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 5);
					const replacing = {
						...addedTxs[0],
						id: 'new-id',
						fee: addedTxs[0].fee - BigInt(100),
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toEqual(false);
					expect(transactionList.size).toEqual(5);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(
						addedTxs[0].id,
					);
				});
			});

			describe('when the same nonce transaction with the same fee is added', () => {
				it('should not replace and not add to the list', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 5);
					const replacing = {
						...addedTxs[0],
						id: 'new-id',
						fee: addedTxs[0].fee,
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toEqual(false);
					expect(transactionList.size).toEqual(5);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(
						addedTxs[0].id,
					);
				});
			});

			describe('when new transaction is added', () => {
				it('should add to the list', async () => {
					insertNTransactions(transactionList, 5);
					const adding = {
						id: 'new-id',
						fee: BigInt(500000000),
						nonce: BigInt(6),
					} as Transaction;
					// Act
					const { added } = transactionList.add(adding);
					// Assert
					expect(added).toEqual(true);
					expect(transactionList.size).toEqual(6);
					expect(transactionList.get(BigInt(6))?.id).toEqual('new-id');
				});
			});

			describe('when new transaction is added with processable true while having empty processable', () => {
				it('should add to the list and mark as processable', async () => {
					insertNTransactions(transactionList, 5, 1);
					const adding = {
						id: 'new-id',
						fee: BigInt(500000000),
						nonce: BigInt(0),
					} as Transaction;
					// Act
					const { added } = transactionList.add(adding, true);
					// Assert
					expect(added).toEqual(true);
					expect(transactionList.size).toEqual(6);
					expect(transactionList.get(BigInt(0))?.id).toEqual('new-id');
					expect(transactionList.getProcessable()[0].id).toEqual('new-id');
				});
			});
		});

		describe('given list has no space', () => {
			describe('when the same nonce transaction with higher fee is added', () => {
				it('should replace with the new transaction', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const replacing = {
						...addedTxs[0],
						id: 'new-id',
						fee: addedTxs[0].fee + BigInt(500000000),
					};
					// Act
					const { added, removedID } = transactionList.add(replacing);
					// Assert
					expect(added).toEqual(true);
					expect(removedID).toEqual(addedTxs[0].id);
					expect(transactionList.size).toEqual(10);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual('new-id');
				});

				it('should demote all subsequent transactions', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					transactionList.promote(addedTxs);
					const replacing = {
						...addedTxs[0],
						id: 'new-id',
						fee: addedTxs[0].fee + BigInt(500000000),
					};
					// Act
					const { added, removedID } = transactionList.add(replacing);
					// Assert
					expect(added).toEqual(true);
					expect(removedID).toEqual(addedTxs[0].id);
					expect(transactionList.size).toEqual(10);
					expect(transactionList.getProcessable()).toHaveLength(0);
					expect(transactionList.getUnprocessable()).toHaveLength(10);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual('new-id');
				});
			});

			describe('when the same nonce transaction with higher fee but lower than minReplaceFeeDiff is added', () => {
				it('should replace with the new transaction', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const replacing = {
						...addedTxs[0],
						id: 'new-id',
						fee: addedTxs[0].fee + BigInt(5),
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toEqual(false);
					expect(transactionList.size).toEqual(10);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(
						addedTxs[0].id,
					);
				});
			});

			describe('when the same nonce transaction with the lower than min replacement fee is added', () => {
				it('should not replace and not add to the list', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const replacing = {
						...addedTxs[0],
						id: 'new-id',
						fee: addedTxs[0].fee - BigInt(100),
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toEqual(false);
					expect(transactionList.size).toEqual(10);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(
						addedTxs[0].id,
					);
				});
			});

			describe('when the same nonce transaction with the same fee is added', () => {
				it('should not replace and not add to the list', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const replacing = {
						...addedTxs[0],
						id: 'new-id',
						fee: addedTxs[0].fee,
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toEqual(false);
					expect(transactionList.size).toEqual(10);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(
						addedTxs[0].id,
					);
				});
			});

			describe('when new transaction is added with higher nonce than the existing highest nonce', () => {
				it('should not add to the list', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const adding = {
						id: 'new-id',
						fee: addedTxs[0].fee + BigInt(500000000),
						nonce: BigInt(100),
					} as Transaction;
					// Act
					const { added } = transactionList.add(adding);
					// Assert
					expect(added).toEqual(false);
					expect(transactionList.size).toEqual(10);
				});
			});

			describe('when new transaction is added with lower nonce than the existing highest nonce', () => {
				it('should add the new transaction and remove the highest nonce transaction', async () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10, 1);
					const adding = {
						id: 'new-id',
						fee: addedTxs[0].fee + BigInt(500000000),
						nonce: BigInt(0),
					} as Transaction;
					jest.spyOn(transactionList.events, 'emit');
					// Act
					const { added, removedID } = transactionList.add(adding);
					// Assert
					expect(added).toEqual(true);
					expect(removedID).toEqual('10');
					expect(transactionList.size).toEqual(10);
					expect(transactionList.get(BigInt(0))?.id).toEqual('new-id');
					expect(transactionList.events.emit).toHaveBeenCalledWith(
						EVENT_TRANSACTION_REMOVED,
						{
							address: defaultAddress,
							id: '10',
						},
					);
				});
			});
		});
	});

	describe('remove', () => {
		describe('when removing transaction does not exist', () => {
			it('should not change the size and return false', async () => {
				// Arrange
				insertNTransactions(transactionList, 10, 1);
				// Act
				const removed = transactionList.remove(BigInt(0));
				// Assert
				expect(removed).toBeUndefined();
				expect(transactionList.size).toEqual(10);
			});
		});

		describe('when removing transaction exists and is processable', () => {
			it('should remove the transaction and all the rest are demoted', async () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 10);
				transactionList.promote(addedTxs);
				// Act
				const removed = transactionList.remove(BigInt(5));
				// Assert
				expect(removed).toEqual('5');
				expect(transactionList.size).toEqual(9);
				expect(transactionList.getProcessable()).toHaveLength(5);
				expect(transactionList.getUnprocessable()).toHaveLength(4);
			});
		});
	});

	describe('promote', () => {
		describe('when promoting transaction does exist id', () => {
			it('should not mark any transactions as promotable', async () => {
				// Arrange
				insertNTransactions(transactionList, 10);
				// Act
				transactionList.promote([
					{
						id: '11',
						nonce: BigInt(11),
						fee: BigInt(1000000),
					} as Transaction,
				]);
				// Assert
				expect(transactionList.getProcessable()).toHaveLength(0);
			});
		});

		describe('when promoting transaction does not match id', () => {
			it('should not mark any transactions as promotable', async () => {
				// Arrange
				insertNTransactions(transactionList, 10);
				// Act
				transactionList.promote([
					{
						id: 'new-id',
						nonce: BigInt(0),
						fee: BigInt(1000000),
					} as Transaction,
				]);
				// Assert
				expect(transactionList.getProcessable()).toHaveLength(0);
			});
		});

		describe('when promoting transaction matches id', () => {
			it('should mark all the transactions as processable', async () => {
				// Arrange
				const addedTrx = insertNTransactions(transactionList, 10);
				// Act
				transactionList.promote(addedTrx.slice(0, 3));
				// Assert
				expect(transactionList.getProcessable()).toHaveLength(3);
			});

			it('should maintain processable in order ', async () => {
				// Arrange
				const addedTrx = insertNTransactions(transactionList, 60);
				// Act
				transactionList.promote(addedTrx.slice(9, 10));
				transactionList.promote(addedTrx.slice(10, 22));
				// Assert
				const processable = transactionList.getProcessable();
				expect(processable[0].nonce.toString()).toEqual('9');
				expect(processable[processable.length - 1].nonce.toString()).toEqual(
					'21',
				);
			});
		});
	});

	describe('size', () => {
		it('should give back the total size of processable and nonprocessable', async () => {
			// Arrange
			const addedTxs = insertNTransactions(transactionList, 10);
			// Act
			transactionList.promote(addedTxs.slice(0, 3));
			// Assert
			expect(transactionList.size).toEqual(10);
		});
	});

	describe('getProcessable', () => {
		describe('when there are only processable transactions', () => {
			it('should return all the transactions in order of nonce', async () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 10);
				transactionList.promote(addedTxs.slice(0, 3));
				// Act
				const processable = transactionList.getProcessable();
				expect(processable).toHaveLength(3);
				expect(processable[0].nonce + BigInt(1)).toEqual(processable[1].nonce);
				expect(processable[1].nonce + BigInt(1)).toEqual(processable[2].nonce);
			});
		});

		describe('when there are only unprocessable transactions', () => {
			it('should return empty array', async () => {
				// Arrange
				insertNTransactions(transactionList, 10);
				// Act
				const processable = transactionList.getProcessable();
				expect(processable).toHaveLength(0);
			});
		});
	});

	describe('getUnprocessable', () => {
		describe('when there are only processable transactions', () => {
			it('should return empty array', async () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 10);
				transactionList.promote(addedTxs);
				// Act
				expect(transactionList.getUnprocessable()).toHaveLength(0);
			});
		});

		describe('when there are only unprocessable transactions', () => {
			it('should return all the transactions in order of nonce', async () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 5);
				insertNTransactions(transactionList, 5, 15);
				transactionList.promote(addedTxs.slice(0, 3));
				// Act
				const unprocessable = transactionList.getUnprocessable();
				expect(unprocessable).toHaveLength(7);
				expect.assertions(1 + unprocessable.length - 1);
				for (let i = 0; i < unprocessable.length - 1; i += 1) {
					expect(Number(unprocessable[i].nonce.toString())).toBeLessThan(
						Number(unprocessable[i + 1].nonce.toString()),
					);
				}
			});
		});
	});

	describe('getPromotable', () => {
		describe('when there are only processable transactions', () => {
			it('should return empty array', async () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 10);
				transactionList.promote(addedTxs);
				// Act
				expect(transactionList.getPromotable()).toHaveLength(0);
			});
		});

		describe('when there are processable and unprocessable transactions and unprocessable nonce is not continuous to processable', () => {
			it('should return empty array', async () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 5);
				insertNTransactions(transactionList, 5, 10);
				transactionList.promote(addedTxs.slice(0, 6));
				// Act
				expect(transactionList.getPromotable()).toHaveLength(0);
			});
		});

		describe('when there are only unprocessable transactions and all nonce are not continuous', () => {
			it('should return only the first unprocessable transaction', async () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 1);
				insertNTransactions(transactionList, 1, 3);
				insertNTransactions(transactionList, 1, 5);
				insertNTransactions(transactionList, 1, 7);
				// Act
				const promotable = transactionList.getPromotable();
				// Assert
				expect(promotable).toHaveLength(1);
				expect(promotable[0].id).toEqual(addedTxs[0].id);
			});
		});

		describe('when there are only unprocessable transactions and all nonce are partially continuous', () => {
			it('should return all the promotables in order of nonce', async () => {
				// Arrange
				insertNTransactions(transactionList, 10, 10);
				// Act
				const promotable = transactionList.getPromotable();
				// Assert
				expect(promotable).toHaveLength(10);
				expect.assertions(1 + promotable.length - 1);
				for (let i = 0; i < promotable.length - 1; i += 1) {
					expect(Number(promotable[i].nonce.toString())).toBeLessThan(
						Number(promotable[i + 1].nonce.toString()),
					);
				}
			});
		});
	});
});
