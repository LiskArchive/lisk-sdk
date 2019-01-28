/*
 * Copyright © 2018 Lisk Foundation
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
import { expect } from 'chai';
import { SinonStub } from 'sinon';
import {
	MULTISIGNATURE_FEE,
	MULTISIGNATURE_MAX_KEYSGROUP,
	MULTISIGNATURE_MIN_KEYSGROUP,
	MULTISIGNATURE_MAX_LIFETIME,
	MULTISIGNATURE_MIN_LIFETIME,
} from '../../src/constants';
import {
	BaseTransaction,
	MultisignatureTransaction,
} from '../../src/transactions';
import { Account, Status, TransactionJSON } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';
import { addTransactionFields } from '../helpers';
import {
	validMultisignatureAccount,
	validMultisignatureRegistrationTransaction,
	validTransaction,
} from '../../fixtures';
import * as utils from '../../src/utils';

describe('Multisignature transaction class', () => {
	const validMultisignatureTransaction = addTransactionFields(
		validMultisignatureRegistrationTransaction,
	);
	let validTestTransaction: MultisignatureTransaction;
	let sender: Account;
	beforeEach(async () => {
		validTestTransaction = new MultisignatureTransaction(
			validMultisignatureTransaction,
		);
		sender = validMultisignatureAccount;
	});

	describe('#constructor', () => {
		it('should create instance of MultisignatureTransaction', async () => {
			expect(validTestTransaction)
				.to.be.an('object')
				.and.be.instanceof(MultisignatureTransaction);
		});

		it('should set multisignature asset', async () => {
			expect(validTestTransaction.asset).to.eql(
				validMultisignatureRegistrationTransaction.asset,
			);
		});

		it('should set fee to multisignature transaction fee amount', async () => {
			expect(validTestTransaction.fee.toString()).to.eql(
				(
					MULTISIGNATURE_FEE *
					(validTestTransaction.asset.multisignature.keysgroup.length + 1)
				).toString(),
			);
		});

		it('should throw TransactionMultiError when asset min is not a number', async () => {
			const invalidMultisignatureTransactionData = {
				...validMultisignatureTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						min: '2',
					},
				},
			};
			expect(
				() =>
					new MultisignatureTransaction(invalidMultisignatureTransactionData),
			).to.throw('Invalid field types');
		});

		it('should throw TransactionMultiError when asset lifetime is not a number', async () => {
			const invalidMultisignatureTransactionData = {
				...validMultisignatureTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						lifetime: '1',
					},
				},
			};
			expect(
				() =>
					new MultisignatureTransaction(invalidMultisignatureTransactionData),
			).to.throw('Invalid field types');
		});
	});

	describe('#create', () => {
		const timeWithOffset = 38350076;
		const passphrase = 'secret';
		const secondPassphrase = 'second secret';
		let result: object;
		let multisignatureAsset: object;

		beforeEach(async () => {
			sandbox.stub(utils, 'getTimeWithOffset').returns(timeWithOffset);
			multisignatureAsset = {
				min: 2,
				lifetime: 1,
				keysgroup:
					validMultisignatureRegistrationTransaction.asset.multisignature
						.keysgroup,
			};
		});

		describe('when the transaction is created with one passphrase and multisignature asset', () => {
			beforeEach(async () => {
				result = MultisignatureTransaction.create({
					passphrase,
					min: 2,
					lifetime: 1,
					keysgroup: validMultisignatureRegistrationTransaction.asset.multisignature.keysgroup.map(
						key => key.substring(1),
					),
				});
			});

			it('should create multisignature transaction ', async () => {
				expect(result).to.have.property('id');
				expect(result).to.have.property('type', 4);
				expect(result).to.have.property('amount', '0');
				expect(result).to.have.property(
					'fee',
					(
						MULTISIGNATURE_FEE *
						(validTestTransaction.asset.multisignature.keysgroup.length + 1)
					).toString(),
				);
				expect(result).to.have.property('senderId');
				expect(result).to.have.property('senderPublicKey');
				expect(result).to.have.property('timestamp', timeWithOffset);
				expect(result).to.have.property('signature').and.not.to.be.empty;
				expect((result as any).asset.multisignature).to.eql(
					multisignatureAsset,
				);
			});

			it('should use time.getTimeWithOffset to calculate the timestamp', async () => {
				expect(utils.getTimeWithOffset).to.be.calledWithExactly(undefined);
			});

			it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', async () => {
				const offset = -10;
				MultisignatureTransaction.create({
					passphrase,
					min: 2,
					lifetime: 1,
					keysgroup: validMultisignatureRegistrationTransaction.asset.multisignature.keysgroup.map(
						key => key.substring(1),
					),
					timeOffset: offset,
				});
				expect(utils.getTimeWithOffset).to.be.calledWithExactly(offset);
			});
		});

		describe('when the transaction is created with one passphrase, second passphrase and multisignature asset', () => {
			beforeEach(async () => {
				result = MultisignatureTransaction.create({
					passphrase,
					secondPassphrase,
					min: 2,
					lifetime: 1,
					keysgroup: validMultisignatureRegistrationTransaction.asset.multisignature.keysgroup.map(
						key => key.substring(1),
					),
				});
			});

			it('should create multisignature transaction ', async () => {
				expect(result).to.have.property('id');
				expect(result).to.have.property('type', 4);
				expect(result).to.have.property('amount', '0');
				expect(result).to.have.property(
					'fee',
					(
						MULTISIGNATURE_FEE *
						(validTestTransaction.asset.multisignature.keysgroup.length + 1)
					).toString(),
				);
				expect(result).to.have.property('senderId');
				expect(result).to.have.property('senderPublicKey');
				expect(result).to.have.property('timestamp', timeWithOffset);
				expect(result).to.have.property('signature').and.not.to.be.empty;
				expect(result).to.have.property('signSignature').and.not.to.be.empty;
				expect((result as any).asset.multisignature).to.eql(
					multisignatureAsset,
				);
			});
		});

		describe('when the transaction is created with invalid inputs', () => {
			it('should throw an invalid input error when lifetime is not a valid integer', async () => {
				expect(
					MultisignatureTransaction.create.bind(undefined, {
						passphrase,
						min: 2,
						lifetime: ('1' as unknown) as number,
						keysgroup: validMultisignatureRegistrationTransaction.asset.multisignature.keysgroup.map(
							key => key.substring(1),
						),
					}),
				).to.throw(
					`Please provide a valid lifetime value. Expected integer between ${MULTISIGNATURE_MIN_LIFETIME} and ${MULTISIGNATURE_MAX_LIFETIME}.`,
				);
			});

			it('should throw an invalid input error when min is not a valid integer', async () => {
				expect(
					MultisignatureTransaction.create.bind(undefined, {
						passphrase,
						secondPassphrase,
						min: ('2' as unknown) as number,
						lifetime: 1,
						keysgroup: validMultisignatureRegistrationTransaction.asset.multisignature.keysgroup.map(
							key => key.substring(1),
						),
					}),
				).to.throw(
					`Please provide a valid minimum value. Expected integer between ${MULTISIGNATURE_MIN_KEYSGROUP} and ${MULTISIGNATURE_MAX_KEYSGROUP}.`,
				);
			});
		});

		describe('when the transaction is created without passphrase', () => {
			beforeEach(async () => {
				result = MultisignatureTransaction.create({
					min: 2,
					lifetime: 1,
					keysgroup: validMultisignatureRegistrationTransaction.asset.multisignature.keysgroup.map(
						key => key.substring(1),
					),
				});
			});

			it('should create multisignature transaction ', async () => {
				expect(result).to.have.property('type', 4);
				expect(result).to.have.property('amount', '0');
				expect(result).to.have.property(
					'fee',
					(
						MULTISIGNATURE_FEE *
						(validTestTransaction.asset.multisignature.keysgroup.length + 1)
					).toString(),
				);
				expect(result)
					.to.have.property('timestamp')
					.and.equal(timeWithOffset);
				expect((result as any).senderPublicKey).to.be.undefined;
				expect(result).not.to.have.property('id');
				expect(result).not.to.have.property('signature');
				expect(result).not.to.have.property('signSignature');
			});
		});
	});

	describe('#fromJSON', () => {
		beforeEach(async () => {
			sandbox
				.stub(MultisignatureTransaction.prototype, 'validateSchema')
				.returns({
					id: validTestTransaction.id,
					status: Status.OK,
					errors: [],
				});
			validTestTransaction = MultisignatureTransaction.fromJSON(
				validMultisignatureRegistrationTransaction,
			);
		});

		it('should create instance of DelegateTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(MultisignatureTransaction);
		});

		it('should call validateSchema', async () => {
			expect(validTestTransaction.validateSchema).to.be.calledOnce;
		});

		it('should throw an error if validateSchema returns error', async () => {
			(MultisignatureTransaction.prototype.validateSchema as SinonStub).returns(
				{
					status: Status.FAIL,
					errors: [new TransactionError()],
				},
			);
			expect(
				MultisignatureTransaction.fromJSON.bind(
					undefined,
					validMultisignatureRegistrationTransaction,
				),
			).to.throw('Failed to validate schema');
		});
	});

	describe('#getAssetBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(
				Buffer.from(
					'02012b343061663634333236356137313838343466336461633536636531376165316437643437643061323461333561323737613061366362306261616131393339662b643034326164336631613562303432646463356161383063343236376235626664336234646461336136383264613061336566373236393430393334376164622b35343266646330303839363465616363353830303839323731333533323638643635356162356563323832393638376161646332373836353366616433336366',
					'hex',
				),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true with non conflicting transactions', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validTransaction,
			] as ReadonlyArray<TransactionJSON>);

			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with error when other transaction from same account has the same type', async () => {
			const conflictTransaction = {
				...validTransaction,
				senderPublicKey:
					validMultisignatureRegistrationTransaction.senderPublicKey,
				type: 4,
			};
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				conflictTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(1);
			expect(status).to.equal(Status.FAIL);
		});
	});

	describe('#assetToJSON', async () => {
		it('should return an object of type transfer asset', async () => {
			expect(validTestTransaction.assetToJSON()).to.eql(
				validMultisignatureRegistrationTransaction.asset,
			);
		});
	});

	describe('#validateSchema', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.validateSchema();
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with error when asset min is over limit', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						min: 18,
					},
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should return TransactionResponse with error when lifetime is under minimum', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						lifetime: 0,
					},
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should return TransactionResponse with error when keysgroup includes invalid keys', async () => {
			const invalidTransaction = {
				...validMultisignatureTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						keysgroup: validMultisignatureTransaction.asset.multisignature.keysgroup.map(
							(key: string) => key.replace('+', ''),
						),
					},
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should return TransactionResponse with error when keysgroup has too many keys', async () => {
			const invalidTransaction = {
				...validMultisignatureTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						keysgroup: [
							'+40af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
							'+d042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
							'+542fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
							'+30af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
							'+a042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
							'+442fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
							'+10af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
							'+z042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
							'+x42fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
							'+c0af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
							'+v042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
							'+b42fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
							'+80af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
							'+n042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
							'+042fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
							'+k42fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
						],
					},
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should return TransactionResponse with error when recipientId is not empty', async () => {
			const invalidTransaction = {
				...validMultisignatureTransaction,
				recipientId: '1L',
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();

			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should return TransactionResponse with error when recipientPublicKey is not empty', async () => {
			const invalidTransaction = {
				...validMultisignatureTransaction,
				recipientPublicKey: '123',
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});
	});

	describe('#verify', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { multisignatures, ...nonMultisignatureAccount } = sender;
			const { status, errors } = validTestTransaction.verify({
				sender: nonMultisignatureAccount,
			});

			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with error when account is already multisignature', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender,
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.signatures');
		});

		it('should return TransactionResponse with error when keysgroup includes sender key', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender: {
					...sender,
					multisignatures: [
						...(sender as any).multisignatures,
						sender.publicKey,
					],
				},
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.signatures');
		});
	});

	describe('#apply', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { multisignatures, ...nonMultisignatureAccount } = sender;
			const { status, errors } = validTestTransaction.apply({
				sender: nonMultisignatureAccount,
			});

			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with error when account is already multisignature', async () => {
			const { status, errors } = validTestTransaction.apply({
				sender,
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.signatures');
		});

		it('should return TransactionResponse with error when keysgroup includes sender key', async () => {
			const { status, errors } = validTestTransaction.apply({
				sender: {
					...sender,
					multisignatures: [
						...(sender as any).multisignatures,
						sender.publicKey,
					],
				},
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.signatures');
		});

		it('should throw an error when state does not exist from the base transaction', async () => {
			sandbox.stub(BaseTransaction.prototype, 'apply').returns({});
			expect(
				validTestTransaction.apply.bind(validMultisignatureTransaction, {
					sender,
				}),
			).to.throw('State is required for applying transaction');
		});

		it('should return updated account state with multisignatures', async () => {
			const { multisignatures, ...nonMultisignatureAccount } = sender;
			const { state } = validTestTransaction.apply({
				sender: nonMultisignatureAccount,
			});
			expect((state as any).sender.multisignatures).to.eql(
				validMultisignatureAccount.multisignatures,
			);
		});
	});

	describe('#undo', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.undo({
				sender,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.undo({
				sender,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should throw an error when state does not exist from the base transaction', async () => {
			sandbox.stub(BaseTransaction.prototype, 'undo').returns({});
			expect(
				validTestTransaction.undo.bind(validMultisignatureTransaction, {
					sender,
				}),
			).to.throw('State is required for undoing transaction');
		});

		it('should return updated account state with removed username', async () => {
			const { state } = validTestTransaction.undo({
				sender,
			});
			expect((state as any).sender.multisignatures).to.not.exist;
		});
	});
});
