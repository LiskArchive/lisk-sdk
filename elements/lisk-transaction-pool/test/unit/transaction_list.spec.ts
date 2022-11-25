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
import { TransactionList } from '../../src/transaction_list';
import { Transaction } from '../../src/types';

const insertNTransactions = (
	transactionList: TransactionList,
	n: number,
	nonceStart = 0,
): Transaction[] => {
	const addedTransactions = [];
	for (let i = nonceStart; i < nonceStart + n; i += 1) {
		const tx = {
			id: Buffer.from(i.toString()),
			nonce: BigInt(i),
			fee: BigInt(i * 1000),
		} as Transaction;
		addedTransactions.push(tx);
		transactionList.add(tx);
	}
	return addedTransactions;
};

describe('TransactionList class', () => {
	const defaultAddress = Buffer.from('d04699e57c4a3846c988f3c15306796f8eae5c1c', 'hex');

	let transactionList: TransactionList;

	beforeEach(() => {
		transactionList = new TransactionList(defaultAddress);
	});

	describe('constructor', () => {
		describe('when option are not given', () => {
			it('should set default values', () => {
				expect((transactionList as any)._maxSize).toBe(64);
				expect((transactionList as any)._minReplacementFeeDifference.toString()).toBe('10');
			});
		});

		describe('when option are given', () => {
			it('should set the value to given option values', () => {
				transactionList = new TransactionList(defaultAddress, {
					maxSize: 10,
					minReplacementFeeDifference: BigInt(100),
				});
				expect((transactionList as any)._maxSize).toBe(10);
				expect((transactionList as any)._minReplacementFeeDifference.toString()).toBe('100');
			});
		});
	});

	describe('add', () => {
		beforeEach(() => {
			transactionList = new TransactionList(defaultAddress, {
				maxSize: 10,
				minReplacementFeeDifference: BigInt(10),
			});
		});

		describe('given list still has spaces', () => {
			describe('when the same nonce transaction with higher fee is added', () => {
				it('should replace with the new transaction', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 5);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from(Buffer.from('new-id')),
						fee: addedTxs[0].fee + BigInt(500000000),
					};
					// Act
					const { added, removedID } = transactionList.add(replacing);
					// Assert
					expect(removedID).toEqual(addedTxs[0].id);
					expect(added).toBe(true);
					expect(transactionList.size).toBe(5);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(Buffer.from('new-id'));
				});

				it('should demote all subsequent transactions', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 5);
					transactionList.promote(addedTxs);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee + BigInt(500000000),
					};
					// Act
					const { added, removedID } = transactionList.add(replacing);
					// Assert
					expect(added).toBe(true);
					expect(removedID).toEqual(addedTxs[0].id);
					expect(transactionList.size).toBe(5);
					expect(transactionList.getProcessable()).toHaveLength(0);
					expect(transactionList.getUnprocessable()).toHaveLength(5);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(Buffer.from('new-id'));
				});
			});

			describe('when the same nonce transaction with higher fee but lower than minReplaceFeeDiff is added', () => {
				it('should not replace and not add to the list', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 5);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee + BigInt(5),
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toBe(false);
					expect(transactionList.size).toBe(5);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(addedTxs[0].id);
				});
			});

			describe('when the same nonce transaction with a lower fee than min replacement fee is added', () => {
				it('should not replace and not add to the list', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 5);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee - BigInt(100),
					};
					// Act
					const { added, reason } = transactionList.add(replacing);
					// Assert
					expect(added).toBe(false);
					expect(reason).toBe(
						'Incoming transaction fee is not sufficient to replace existing transaction',
					);
					expect(transactionList.size).toBe(5);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(addedTxs[0].id);
				});
			});

			describe('when the same nonce transaction with the same fee is added', () => {
				it('should not replace and not add to the list', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 5);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee,
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toBe(false);
					expect(transactionList.size).toBe(5);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(addedTxs[0].id);
				});
			});

			describe('when new transaction is added', () => {
				it('should add to the list', () => {
					insertNTransactions(transactionList, 5);
					const adding = {
						id: Buffer.from('new-id'),
						fee: BigInt(500000000),
						nonce: BigInt(6),
					} as Transaction;
					// Act
					const { added } = transactionList.add(adding);
					// Assert
					expect(added).toBe(true);
					expect(transactionList.size).toBe(6);
					expect(transactionList.get(BigInt(6))?.id).toEqual(Buffer.from('new-id'));
				});
			});

			describe('when new transaction is added with processable true while having empty processable', () => {
				it('should add to the list and mark as processable', () => {
					insertNTransactions(transactionList, 5, 1);
					const adding = {
						id: Buffer.from('new-id'),
						fee: BigInt(500000000),
						nonce: BigInt(0),
					} as Transaction;
					// Act
					const { added } = transactionList.add(adding, true);
					// Assert
					expect(added).toBe(true);
					expect(transactionList.size).toBe(6);
					expect(transactionList.get(BigInt(0))?.id).toEqual(Buffer.from('new-id'));
					expect(transactionList.getProcessable()[0].id).toEqual(Buffer.from('new-id'));
				});
			});
		});

		describe('when the transaction list is full', () => {
			describe('when the same nonce transaction with higher fee is added', () => {
				it('should replace with the new transaction', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee + BigInt(500000000),
					};
					// Act
					const { added, removedID } = transactionList.add(replacing);
					// Assert
					expect(added).toBe(true);
					expect(removedID).toEqual(addedTxs[0].id);
					expect(transactionList.size).toBe(10);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(Buffer.from('new-id'));
				});

				it('should demote all subsequent transactions', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					transactionList.promote(addedTxs);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee + BigInt(500000000),
					};
					// Act
					const { added, removedID } = transactionList.add(replacing);
					// Assert
					expect(added).toBe(true);
					expect(removedID).toEqual(addedTxs[0].id);
					expect(transactionList.size).toBe(10);
					expect(transactionList.getProcessable()).toHaveLength(0);
					expect(transactionList.getUnprocessable()).toHaveLength(10);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(Buffer.from('new-id'));
				});
			});

			describe('when the same nonce transaction with higher fee and greater than minReplaceFeeDiff is added', () => {
				it('should replace with the new transaction', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee + BigInt(11),
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toBe(true);
					expect(transactionList.size).toBe(10);
					expect(transactionList.get(replacing.nonce)?.id).toEqual(replacing.id);
				});
			});

			describe('when the same nonce transaction with higher fee but lower than minReplaceFeeDiff is added', () => {
				it('should reject the new incoming replacing transaction', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee + BigInt(5),
					};
					// Act
					const { added, reason } = transactionList.add(replacing);
					// Assert
					expect(added).toBe(false);
					expect(reason).toBe(
						'Incoming transaction fee is not sufficient to replace existing transaction',
					);
					expect(transactionList.size).toBe(10);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(addedTxs[0].id);
				});
			});

			describe('when the same nonce transaction with a lower fee than min replacement fee is added', () => {
				it('should not replace and not add to the list', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee - BigInt(100),
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toBe(false);
					expect(transactionList.size).toBe(10);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(addedTxs[0].id);
				});
			});

			describe('when the same nonce transaction with the same fee is added', () => {
				it('should not replace and not add to the list', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const replacing = {
						...addedTxs[0],
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee,
					};
					// Act
					const { added } = transactionList.add(replacing);
					// Assert
					expect(added).toBe(false);
					expect(transactionList.size).toBe(10);
					expect(transactionList.get(addedTxs[0].nonce)?.id).toEqual(addedTxs[0].id);
				});
			});

			describe('when new transaction is added with higher nonce than the existing highest nonce', () => {
				it('should not add to the list', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10);
					const adding = {
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee + BigInt(500000000),
						nonce: BigInt(100),
					} as Transaction;
					// Act
					const { added, reason } = transactionList.add(adding);
					// Assert
					expect(added).toBe(false);
					expect(reason).toBe(
						'Incoming transaction exceeds maximum transaction limit per account',
					);
					expect(transactionList.size).toBe(10);
				});
			});

			describe('when new transaction is added with lower nonce than the existing highest nonce', () => {
				it('should add the new transaction and remove the highest nonce transaction', () => {
					// Arrange
					const addedTxs = insertNTransactions(transactionList, 10, 1);
					const adding = {
						id: Buffer.from('new-id'),
						fee: addedTxs[0].fee + BigInt(500000000),
						nonce: BigInt(0),
					} as Transaction;
					// Act
					const { added, removedID } = transactionList.add(adding);
					// Assert
					expect(added).toBe(true);
					expect(removedID).toEqual(Buffer.from('10'));
					expect(transactionList.size).toBe(10);
					expect(transactionList.get(BigInt(0))?.id).toEqual(Buffer.from('new-id'));
				});
			});
		});
	});

	describe('remove', () => {
		describe('when removing transaction does not exist', () => {
			it('should not change the size and return false', () => {
				// Arrange
				insertNTransactions(transactionList, 10, 1);
				// Act
				const removed = transactionList.remove(BigInt(0));
				// Assert
				expect(removed).toBeUndefined();
				expect(transactionList.size).toBe(10);
			});
		});

		describe('when removing transaction exists and is processable', () => {
			it('should remove the transaction and all the rest are demoted', () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 10);
				transactionList.promote(addedTxs);
				// Act
				const removed = transactionList.remove(BigInt(5));
				// Assert
				expect(removed).toEqual(Buffer.from('5'));
				expect(transactionList.size).toBe(9);
				expect(transactionList.getProcessable()).toHaveLength(5);
				expect(transactionList.getUnprocessable()).toHaveLength(4);
			});
		});
	});

	describe('promote', () => {
		describe('when promoting transaction id does not exist', () => {
			it('should not mark any transactions as promotable', () => {
				// Arrange
				insertNTransactions(transactionList, 10);
				// Act
				transactionList.promote([
					{
						id: Buffer.from('11'),
						nonce: BigInt(11),
						fee: BigInt(1000000),
					} as Transaction,
				]);
				// Assert
				expect(transactionList.getProcessable()).toHaveLength(0);
			});
		});

		describe('when promoting transaction matches id', () => {
			it('should mark all the transactions as processable', () => {
				// Arrange
				const addedTrx = insertNTransactions(transactionList, 10);
				// Act
				transactionList.promote(addedTrx.slice(0, 3));
				// Assert
				expect(transactionList.getProcessable()).toHaveLength(3);
			});

			it('should maintain processable in order', () => {
				// Arrange
				const addedTrx = insertNTransactions(transactionList, 60);
				// Act
				transactionList.promote(addedTrx.slice(9, 10));
				transactionList.promote(addedTrx.slice(10, 22));
				// Assert
				const processable = transactionList.getProcessable();
				expect(processable[0].nonce.toString()).toBe('9');
				expect(processable[processable.length - 1].nonce.toString()).toBe('21');
			});
		});
	});

	describe('size', () => {
		it('should give back the total size of processable and nonprocessable', () => {
			// Arrange
			const addedTxs = insertNTransactions(transactionList, 10);
			// Act
			transactionList.promote(addedTxs.slice(0, 3));
			// Assert
			expect(transactionList.size).toBe(10);
		});
	});

	describe('getProcessable', () => {
		describe('when there are only processable transactions', () => {
			it('should return all the transactions in order of nonce', () => {
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
			it('should return empty array', () => {
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
			it('should return empty array', () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 10);
				transactionList.promote(addedTxs);
				// Act
				expect(transactionList.getUnprocessable()).toHaveLength(0);
			});
		});

		describe('when there are only unprocessable transactions', () => {
			it('should return all the transactions in order of nonce', () => {
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
			it('should return empty array', () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 10);
				transactionList.promote(addedTxs);
				// Act
				expect(transactionList.getPromotable()).toHaveLength(0);
			});
		});

		describe('when there are processable and unprocessable transactions and unprocessable nonce is not continuous to processable', () => {
			it('should return empty array', () => {
				// Arrange
				const addedTxs = insertNTransactions(transactionList, 5);
				insertNTransactions(transactionList, 5, 10);
				transactionList.promote(addedTxs.slice(0, 6));
				// Act
				expect(transactionList.getPromotable()).toHaveLength(0);
			});
		});

		describe('when there are only unprocessable transactions and all nonces are not continuous', () => {
			it('should return only the first unprocessable transaction', () => {
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

		describe('when there are only unprocessable transactions and all nonces are in sequence order', () => {
			it('should return all the promotables in order of nonce', () => {
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
