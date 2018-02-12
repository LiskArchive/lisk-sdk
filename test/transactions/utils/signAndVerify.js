/*
 * Copyright © 2017 Lisk Foundation
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
	signTransaction,
	multiSignTransaction,
	verifyTransaction,
} from '../../../src/transactions/utils';

import cryptoModule from '../../../src/crypto';

const getTransactionHash = require('../../../src/transactions/utils/getTransactionHash');

describe('signAndVerify transaction utils', () => {
	const defaultPassphrase =
		'minute omit local rare sword knee banner pair rib museum shadow juice';
	const defaultPublicKey =
		'7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultSecondPublicKey =
		'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultSignature =
		'bb3f2d12d098c59a0af03bb1157eeb7bc7141b21cea57861c4eac72a7c55f122b5befb1391c3f8509b562fa748fdc7359f6e6051526d979915157c5bcba34e01';
	const defaultSecondSignature =
		'897090248c0ecdad749d869ddeae59e5029bdbe4806da92d82d6eb7142b624011f4302941db184a2e70bd29a6adac5ce0b4cf780af893db2f504375bdef6850b';
	const defaultHash = Buffer.from(
		'c62214460d66eeb1d9db3fb708e31040d2629fbdb6c93887c5eb0f3243912f91',
		'hex',
	);

	let defaultTransaction;
	let cryptoSignDataStub;
	let cryptoVerifyDataStub;
	let getTransactionHashStub;

	beforeEach(() => {
		defaultTransaction = {
			type: 0,
			amount: 1000,
			recipientId: '58191285901858109L',
			timestamp: 141738,
			asset: {},
			id: '13987348420913138422',
			senderPublicKey: defaultPublicKey,
		};

		cryptoSignDataStub = sandbox
			.stub(cryptoModule, 'signData')
			.returns(defaultSignature);
		cryptoVerifyDataStub = sandbox
			.stub(cryptoModule, 'verifyData')
			.returns(true);
		getTransactionHashStub = sandbox
			.stub(getTransactionHash, 'default')
			.returns(defaultHash);
	});

	describe('#signTransaction', () => {
		let transaction;
		let signature;

		beforeEach(() => {
			transaction = Object.assign({}, defaultTransaction);
			signature = signTransaction(transaction, defaultPassphrase);
		});

		it('should get the transaction hash', () => {
			return getTransactionHashStub.should.be.calledWithExactly(transaction);
		});

		it('should sign the transaction hash with the passphrase', () => {
			return cryptoSignDataStub.should.be.calledWithExactly(
				defaultHash,
				defaultPassphrase,
			);
		});

		it('should return the signature', () => {
			signature.should.be.equal(defaultSignature);
		});
	});

	describe('#multiSignTransaction', () => {
		const defaultMultisignatureHash = Buffer.from(
			'd43eed9049dd8f35106c720669a1148b2c6288d9ea517b936c33a1d84117a760',
			'hex',
		);

		let multiSignatureTransaction;
		let signature;

		beforeEach(() => {
			multiSignatureTransaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey:
					'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature:
					'618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				signSignature:
					'508a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};
			getTransactionHashStub.returns(defaultMultisignatureHash);
			signature = multiSignTransaction(
				multiSignatureTransaction,
				defaultPassphrase,
			);
		});

		it('should remove the signature and second signature before getting transaction hash', () => {
			getTransactionHashStub.args[0].should.not.have.property('signature');
			return getTransactionHashStub.args[0].should.not.have.property(
				'signSignature',
			);
		});

		it('should sign the transaction hash with the passphrase', () => {
			return cryptoSignDataStub.should.be.calledWithExactly(
				defaultMultisignatureHash,
				defaultPassphrase,
			);
		});

		it('should return the signature', () => {
			return signature.should.be.equal(defaultSignature);
		});
	});

	describe('#verifyTransaction', () => {
		let transaction;

		describe('with a single signed transaction', () => {
			beforeEach(() => {
				transaction = Object.assign({}, defaultTransaction, {
					signature: defaultSignature,
				});
			});

			it('should remove the signature before getting transaction hash', () => {
				verifyTransaction(transaction);
				return getTransactionHashStub.args[0].should.not.have.property(
					'signature',
				);
			});

			it('should verify the transaction using the hash, the signature and the public key', () => {
				verifyTransaction(transaction);
				return cryptoVerifyDataStub.should.be.calledWithExactly(
					defaultHash,
					defaultSignature,
					defaultPublicKey,
				);
			});

			it('should return false for an invalid signature', () => {
				cryptoVerifyDataStub.returns(false);
				const verification = verifyTransaction(transaction);
				return verification.should.be.false();
			});

			it('should return true for a valid signature', () => {
				const verification = verifyTransaction(transaction);
				return verification.should.be.true();
			});
		});

		describe('with a second signed transaction', () => {
			beforeEach(() => {
				transaction = Object.assign({}, defaultTransaction, {
					signature: defaultSignature,
					signSignature: defaultSecondSignature,
				});
				getTransactionHashStub
					.onFirstCall()
					.returns(
						Buffer.from(
							'951bb4580dcb6a412de28844e0e06439c5c51dfea2a16730fd94ff20e355f1bd',
							'hex',
						),
					);
			});

			it('should throw if attempting to verify without a secondPublicKey', () => {
				return verifyTransaction
					.bind(null, transaction)
					.should.throw('Cannot verify signSignature without secondPublicKey.');
			});

			it('should remove the second signature before getting the first transaction hash', () => {
				verifyTransaction(transaction, defaultSecondPublicKey);
				return getTransactionHashStub.firstCall.args[0].should.not.have.property(
					'signSignature',
				);
			});

			it('should remove the first signature before getting the second transaction hash', () => {
				verifyTransaction(transaction, defaultSecondPublicKey);
				return getTransactionHashStub.secondCall.args[0].should.not.have.property(
					'signature',
				);
			});

			it('should return false for an invalid second signature', () => {
				cryptoVerifyDataStub.returns(false);
				const verification = verifyTransaction(
					transaction,
					defaultSecondPublicKey,
				);
				return verification.should.be.false();
			});

			it('should return false for an invalid first signature', () => {
				cryptoVerifyDataStub.onSecondCall().returns(false);
				getTransactionHashStub
					.onFirstCall()
					.returns(
						Buffer.from(
							'aef147521619556572f204585332aac247dc2b024cb975518d847e4587bab756',
							'hex',
						),
					);
				const verification = verifyTransaction(
					transaction,
					defaultSecondPublicKey,
				);
				return verification.should.be.false();
			});

			it('should return true for a valid signature', () => {
				const verification = verifyTransaction(
					transaction,
					defaultSecondPublicKey,
				);
				return verification.should.be.true();
			});
		});
	});
});

describe('integration sign and verify', () => {
	describe('given a set of transactions', () => {
		let transactions;
		beforeEach(() => {
			transactions = [
				{
					type: 1,
					amount: 0,
					fee: '500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54316324,
					asset: {
						signature: {
							publicKey:
								'f9666bfed9ef2ff52a04408f22f2bfffaa81384c9433463697330224f10032a4',
						},
					},
					signature:
						'69d0c7bc50b82465e2b0885cebc422aa9cd575050dc89905e22a6e2cc88802935c6809a59a2daa04ca99623a6fef76b7d03215ed7f401b74ef5301b12bfe2002',
					id: '6998015087494860094',
				},
				{
					type: 0,
					amount: '4008489300000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196076,
					asset: {},
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					signature:
						'1518a69983e348359f62a8e740f6f5f08c0c3cad651e5116bf991bc5a4b4cfb8bf8c033a86e30f596fac80142df5a4121400ac2e9307614a143ffd75cc07c20b',
					id: '7507990258936015021',
				},
				{
					type: 3,
					amount: '0',
					fee: '100000000',
					recipientId: '16313739661670634666L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196076,
					asset: {
						votes: [
							'+0d720b72d179bdd07621cf0b6b68fd23a96777e0833f35b9d22b873c80f9b336',
							'+44b58b4a9d8d0af057ada7c90bb90e30be47326c8a102c8bc6604e98ca93d1ef',
							'+a8bde4a93381d7cb756611262af04844fb0a182fb9de515a3c4f068daa05c695',
							'+7c5c08669e9d1366bfe6ae17ca6a054e92610358e2dc82865a826eac738fdb6a',
							'-7742a72b4eb62bd994e2f1e4b44637fbce9fc1fa900080636b2f7eff40872fa6',
						],
					},
					signature:
						'1d9b94e30ff2206b9de6406d9d221c751af00a300ea26fa479da3dd3bb1266d4461f8ae19a08b42ecf6648a86dc6969e965f8a617cd18c1d1ce6126d683e8605',
					id: '6128439024328469721',
				},
				{
					type: 2,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196076,
					asset: {
						delegate: {
							username: 'RLI0',
							publicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
					},
					signature:
						'3147b031c6fa71cbfc3f8a74b9cd5ed85b56b01f00e9df13244c354d43bfa90ec89dd2fe66d8e5107233073b5aac387cb54d1454ac68e73d43203d1f14ec0900',
					id: '5337978774712629501',
				},
				{
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						multisignature: {
							min: 5,
							lifetime: 1,
							keysgroup: [
								'+6638548d991d49e2b41bf15b595fa19749b25c58483e7e8fc926038074571ebf',
								'+a0ed6137800e9a65f796e423d9ebece0a7df53f0049e90eebc2e597452de69ed',
								'+4bb9e15fa15cbe87d19b6854474d57c3aa515deb586548bb515630dc7121d021',
								'+068bcac57c9d988f0a03bab381785c67ef4b63ca8047f41863fb2a0202aa88a5',
								'+261fb86d60785e208ba7541db9ab56d3e02fcf9357a25bf859f826e87cadb816',
							],
						},
					},
					signature:
						'46f6ce8da1b5948aaa63a51cf28913210d356cc27a2cc952a2bf1b88f47d6cd6f250f8d907b9a4e0c531a66c601b50aa483a461e803412f2ae9543d99155970f',
					id: '15911083597203956215',
				},
				{
					type: 5,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						dapp: {
							category: 0,
							name: 'jSFFSiM4HZ91x7DXnOu',
							description: 'HQWQewqxZ0AA330r',
							tags: 'HReDOT69QpOGfR1ELav',
							type: 0,
							link: 'qEXks',
							icon: 'mJM14TJiZSe3OmvYXpkaSqk6pr',
						},
					},
					signature:
						'd4888d8e916127358c5f6417ae4cc110e5509f32ef35589401e1a147e6b20a32fd280567d10f2d11224a94a32db0088a834138408d3a6d490f6be34a57e36207',
					id: '6368378298793859048',
				},
				{
					type: 6,
					amount: '405432',
					fee: '10000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: { inTransfer: { dappId: '1000000' } },
					signature:
						'cac1442ade22a5ca056fcd157188a54f7f3648513ed1d8bbcd0656d7a0ae8aae1711b008623493f174d6318323e7e99ce7b9033a2f2b63d5fdb0406c598eec07',
					id: '11187309556374500080',
				},
				{
					type: 7,
					amount: '728029',
					fee: '10000000',
					recipientId: '1859190791819301L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						outTransfer: { dappId: '433910011', transactionId: '995526027' },
					},
					signature:
						'e817a3bfe8570d13a7a728bcfd108168e47ab48e748424793dd866f61617f1786fc3908c8eaa20f470ae1e11363f8fdc55d64d8e08d0dbc399cccea38ecacc05',
				},
				{
					type: 0,
					amount: '8969127700000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196078,
					asset: {},
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					signature:
						'335033784ce58916373bfdec8c6b0a279155d3bf1f418e42e8a0804fa45906e5f71e8d0a34cb1bcd38397788efaf231e56d6d3527c3a08625ca46c1512d51c0b',
					id: '4937270977123783749',
				},
				{
					type: 3,
					amount: '0',
					fee: '100000000',
					recipientId: '16313739661670634666L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						votes: [
							'+900fcb60a949a9269af36f0da4a7da6e5b9a81bafb1929b2882f8aeda5960ff0',
							'+083d534a51c358e6dce6d43f4f0de8abf5bb1d8b8ee7fe817c5b225bb4c46fd8',
							'+2027d6af78cc6b10d1fa9712dbb6241b67531552c2d3a688d8565c37b8a307ff',
							'+9e3f52823ebdb0e07649b1d260f864691b81a4f7e18fdf8935bbb1bcfe454663',
							'-18982fb4caf0cae685a3ca44fe91445c26bef542f09fc8ea0e25fd33fd948fd7',
						],
					},
					signature:
						'45010721b4ed0424a003da5e82f5917a8895d99adb0bf9509b65cd7dbd14653efd9ed0b4f52a4d1ab7da89e3b8ef33337a67737af451df06bee51b124f741c0b',
					id: '9048233810524582722',
				},
				{
					type: 2,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						delegate: {
							username: 'TYX',
							publicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
					},
					signature:
						'660ba7172a25a19819344c1ac99f0b2532915ede18405563fcf454ff22278f1c8f33bf6fe44a29ac2a4daabf3edd1551809bb081766ef1a5b8a0251c5a656103',
					id: '17457098940654976683',
				},
				{
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						multisignature: {
							min: 3,
							lifetime: 34,
							keysgroup: [
								'+ed2f2b9e8f377f77ad721ad572de0575796789b7a5b29cbafdc294a1f86f8a72',
								'+d2e3dfb830bbbd6dd10ec6022dffac9d189343e7255f89346ede6ffbd66327fd',
								'+e77283fe326d473aff78c74dac627538b7e761a7efd65edbc425c14916657b7a',
								'+5124a5c4f48714c52e5242a124545fe7bf47e4bcdc03f80c485d55c886a98013',
								'+ced89d652d99de651d8d1e5f30661c9a5780bb9b2955d11bf84ed1ed08abe60f',
							],
						},
					},
					signature:
						'97f663b356609227009f664e6072f58b43dbd5dc17f7586e9dad9511fe3272c813f81353135b5831e3c930c5669f0223402047694bc31f61276254c0ec5b170d',
					id: '16196080519305519880',
				},
				{
					type: 5,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						dapp: {
							category: 0,
							name: '',
							description: 'wE3f2s3OYt7eY7WjbFy',
							tags: 'BcnXy7fBVgp',
							type: 0,
							link: '4',
							icon: 'IBaIGbiH',
						},
					},
					signature:
						'8ad74d9fe9db6e9750986bce3890821e8611fa840f86019b891a9d30d5d53371372f0ebc79dab2854e5c0bb62cab3e3a49d76ae05f1f424a1112df0fda771b03',
					id: '4804584599866287174',
				},
				{
					type: 6,
					amount: '897386',
					fee: '10000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: { inTransfer: { dappId: '1000000' } },
					signature:
						'81db12eccf99f92ffc5963383acb0b275777de860e7d2251d1432a1eeb46fb858d41737e68ac5cb61eab5adc7d8f6f6db8905767e997bb445babf6004ab1bb00',
					id: '14834734940279241743',
				},
				{
					type: 7,
					amount: '761715',
					fee: '10000000',
					recipientId: '1859190791819301L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						outTransfer: { dappId: '720987408', transactionId: '40486129' },
					},
					signature:
						'69a84e9a883a8f624cb5dfc80f7d734f0eff9c2d2193f94238a0636b1a56afaeed8261b46de518f9ca7c9efe910628bdce9ff4a78fe86ef1a08a913486142e02',
				},
				{
					type: 0,
					amount: '4054494300000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196078,
					asset: {},
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					signature:
						'7b3f813eb3b130e9d31b74371b2a221fa2915fed0fc4fd435d42ea89c7cb76d7eafb105a973080e00bf54e62f48eb969cb88a4371ffec3c225c2821f9619af08',
					id: '11811758250853952228',
				},
				{
					type: 3,
					amount: '0',
					fee: '100000000',
					recipientId: '16313739661670634666L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						votes: [
							'+3b458651eb45887a10a95489dad3f14a708c8eb2c50af6abfcfb753d4b01dcb3',
							'+0a8e2446495959401daa8adcf7646276eaf49e1cf10993e36ac5a21a39945a7d',
							'+765a399060d14680c7a12246e642b7cb46fede3dfc8f43c6cb57dfefbc1a4533',
							'+586e1f97641d9c736737e9755f658461ed961aa475be28361b8331468a2b8fa0',
							'-332438da41f1c8019098b148482d51fa58dc026cd3fb49d77d4f7356ff0c063d',
						],
					},
					signature:
						'15cbfa6843efa6c6574c986d371ab689cfdddc958ad6ec7b7a8024f98559478cbfae09c7cf4e62e30ffd1331e24951c534db96d3349f828ae9514578f98b120e',
					id: '11944214126253524732',
				},
				{
					type: 2,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						delegate: {
							username: 'g0chqJUQp',
							publicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
					},
					signature:
						'0271091d6055e831ad6c14b6a9fecd77dbf44c4a20285e4df51302134f8ffccc3dcc73ba2a8a5ea1fcebeafd65943f503ffee41a4283f798e7a9996b5eb5a807',
					id: '10417213059747712454',
				},
				{
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						multisignature: {
							min: 3,
							lifetime: 13,
							keysgroup: [
								'+9f207919be15e45a5fd89ec5d699d72390a2ccc6eaaf587d88eefa46a7f7c01c',
								'+f209131118dd05585d3131b5250caf8737b712c63dfc56dcf7d9678e0551b4a8',
								'+9d2a2afd25ee6c48b4aef7f673bffde98c6bf278997a917cce739568eefd99e3',
								'+163cb0f7d9da97611350f72741fececd41d066e45dc8370076b0fabc951232a7',
								'+66c085d46ec6c3b7c9270f9e62b113ce4248c7bd0e5924355307c57fb8ef93ae',
							],
						},
					},
					signature:
						'76a4b1df52bb97bedeaeff199a8ee7408d1bdab3ba735ff70b7e0a362d891d622726814b12499ef2b01b825717f92ba6d3c4ffc5c6fb0a22035b63a140ad4407',
					id: '8904533490777066124',
				},
				{
					type: 5,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						dapp: {
							category: 0,
							name: 'lF7s',
							description: 'BZqgVHKUZjsyr5',
							tags: 'AYV',
							type: 0,
							link: 'dzQ3leCut',
							icon: 'sJoKLJOdAvtdktEl5hzaIttiN',
						},
					},
					signature:
						'99c6e43a6a06caab60b6147dd0eba6c7afbdc4b4f6b82e6911100a454ca1252dfca560a5ec65f01bb03f71fb5e37d8f3ad0255f77b809991acfcf42504eb0e01',
					id: '16584586901330410057',
				},
				{
					type: 6,
					amount: '737434',
					fee: '10000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: { inTransfer: { dappId: '1000000' } },
					signature:
						'7cb7d1c9f37aa5d753cd241d74b20fcd2a1540b27f7d5628b865b9b0e806eba23a0ca7ed043f73a5a881778c9cabd40ef836e0742226c60389075433b725860d',
					id: '10020668765583935219',
				},
				{
					type: 7,
					amount: '646565',
					fee: '10000000',
					recipientId: '1859190791819301L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						outTransfer: { dappId: '336803878', transactionId: '856503447' },
					},
					signature:
						'caae702b9b12bd423cd2f3c742135b459149fb484f9479551bb0f1374c6f805cf881cb64f52b797770a512bdaaabf8404a22857af6713ac70035f5e9359fb60b',
				},
				{
					type: 0,
					amount: '8184360100000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196078,
					asset: {},
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					signature:
						'53c1cb90f379c1afa1b7fb7b7c79689d02ed96da32cc337b511d48573da35fdf261f2f85f744a01a62866c2d672ad1a73286f94ef6af494eb4890f0b6a4a0c02',
					id: '8699527477254187757',
				},
				{
					type: 3,
					amount: '0',
					fee: '100000000',
					recipientId: '16313739661670634666L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						votes: [
							'+dd8fb02b092402d4bb4114cc7b79b83fe7b30a18fceaa62d8a47f737604a34ff',
							'+82e42e6f8f9f4d910d8a883e9163fa46190064c3d112b05f4802fd92fa55b431',
							'+ffcf0152971388d89b007ab293349e55979bf3c81dfb2a41bc5304d3b4140503',
							'+2771daeae7b042c8927c7cf86821bee85f27914c8be3b185a9ff2d749852f923',
							'-64b517fc24df9e1cbc2797b6bdb0747912f3efa5c2b863d53fba95788ef6d099',
						],
					},
					signature:
						'e1ea529a6c252e4a50408693378a38aec68bbd474ee8562b33a3572d5ce38a69a515f7448de5185be0fb2dfc23652c43ea0cc3490683df185b052952f9ec610e',
					id: '1804328474810539521',
				},
				{
					type: 2,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						delegate: {
							username: 'mUUn',
							publicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
					},
					signature:
						'f5a2c0946bcae73ce24a29dbbdc16c1f3fd897ece7de5ae6d2a891f98673b54106f0d516398960f545b00cc0cdbd131a14590b796185e7e72d66fecdb9eab206',
					id: '13111698433238994230',
				},
				{
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						multisignature: {
							min: 5,
							lifetime: 14,
							keysgroup: [
								'+465f0eed0a5614af4c282b35e4f8cc7b8010783aaf848a8c073386f619208864',
								'+a5df78890691147c6b13c9330e2e5fabebfa52ef1eb5d79dfeb3d9892d4c8f8b',
								'+ad8a0767c7cc1e566888902c5588c35c6f75ba985777f6d2f23e428a9c7c470d',
								'+f7b14239c88d7c1e6931532c1a248080bf24591b2b4226748fa0b4b0b060808d',
								'+744d25d065b806d6a4028a8f9de7a4342b8cc8b647e04e7ff66f7ea53df9f8c4',
							],
						},
					},
					signature:
						'c0f3f4ec468b647823511b81e199af569211269f898cbd872291b0f609608815526f837ba18038cfca3b5002e01a0f7054cbc6b6f74de66a275eda4909124206',
					id: '8649508251318979973',
				},
				{
					type: 5,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						dapp: {
							category: 0,
							name: '5pATdfOO',
							description: 'MwNovspfAO0jTsY0o',
							tags: 'HP2qmZaRajMVNaSxB9NypeS19HRfoknG1WlE4l',
							type: 0,
							link: 'EblohNQI',
							icon: 'D',
						},
					},
					signature:
						'f56cca3239759dca1db8be70124e8a3ba1a64e4d1d8e7299e27d82d96fa386cc84bed703897bd60f3b862dc1d201c1688af75dcb572f048ccfc3e69a38c24d0e',
					id: '6415932520816963164',
				},
				{
					type: 6,
					amount: '33067',
					fee: '10000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: { inTransfer: { dappId: '1000000' } },
					signature:
						'33ce5ae051be0a10ad91ce33ee7636856e53eb0d6dfc3532333bbd11d832d7fa5a7f1cf3a3221625cd4c4c4a743587c5286a0e0166e7c2a4317bb4439f3ff008',
					id: '12483552871112483989',
				},
				{
					type: 7,
					amount: '966482',
					fee: '10000000',
					recipientId: '1859190791819301L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						outTransfer: { dappId: '275792609', transactionId: '421790462' },
					},
					signature:
						'7d4cc20b24d9486a26bd74b14ba24ef1d12381f04434f125e8efaa322c1b3c1cb5c357a3b7c47fb4097fa88a0751360a37c28e6b03890f4955d51fff7948ff05',
				},
				{
					type: 0,
					amount: '3649003300000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196078,
					asset: {},
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					signature:
						'8953d989a4be6d2d0ab25dbb11b1268a21ce3681aba6c0fe391b2b7c18179f52af5440aca8b27794eb27d29b41a306f931882190a1ad922c274fb9bc5be63303',
					signSignature:
						'0ccd222e27835d041622c469da6d69c1720202f6bb8258b7199a690b86d1671b45ef8ad03ff0b78a8dd91c38a9fad694d9186f414e83f9ad076e69b72ab02c0d',
					id: '10897127897715572989',
				},
				{
					type: 3,
					amount: '0',
					fee: '100000000',
					recipientId: '16313739661670634666L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						votes: [
							'+791dbbf8e7f52eb253611c92758a25aed0b1ced2c1449272c251dde27a63e164',
							'+2b0fa724137c99da93590c1fbe2f2a988cc28b1b7f66e17942d7c3026b19bd65',
							'+bc97c09776318348138aaf7031b642a665bb3d2bd5e76ccc525dcf74fae960fe',
							'+b3036b5bde0f106f86f72245ca238148e7871235c236fb41bb08d8d0960ca807',
							'-e97c6e9027d940686a92cc56069822ef64e17926ff677f12c88196d0441b8a8a',
						],
					},
					signature:
						'ebf2a10ef69c5282b554b9d23c21c9884e558376f42972515d4d4397b535bb2d521ccfe48f28468a0371e00f2af7550fec1e17d374d75c1abc15051341b4cc00',
					signSignature:
						'640fd85321213dcfa16ce7fcad219aeeb284119016cab7650b83beca2634650e834308996b85861c8046997344d1ff64be7c56bb43f77cea26655d2c17b6b608',
					id: '17799333624445334933',
				},
				{
					type: 2,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						delegate: {
							username: 'r9bGwAqXG1pOnVL',
							publicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
					},
					signature:
						'5c0b596006acb565cee01d22b5de2e60dde69df3c5cbf2e96c4242cb80811f205ae05fcf1110810bd477ad3e67cf42e103c3160e63207bd7d78aa1dbe1496300',
					signSignature:
						'5030bf9be108b4a4084a32a7f35d74b893bdf4c67678b7f94b923b3cf1048d890e94e816a210e4442fe8e7bdab3ab45c1959adae14d6200cf552d3413a10900d',
					id: '12155900509392441171',
				},
				{
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						multisignature: {
							min: 2,
							lifetime: 9,
							keysgroup: [
								'+56364190bc7dd833b37450a45a4beddf1bd7408324b75bf52f85decb424a159b',
								'+11364ec15a0060b0e07846a5dfa81d2f43351bf35b360dc9f780ececb6402ad4',
								'+e29841ce6c5147027b52eb2551ece8c3aa62090f563093e243a978a0dccee692',
								'+f079d3f68a1b0b03824b229efb0814df113f255f1cfb06f26bac205bcadb2840',
								'+95c11960a7deacab27f59518f1b47b3a7f9c37819ca80e9c0fad8a39a2eb3917',
							],
						},
					},
					signature:
						'2afa46bb4563de7f56254b06c8752a4bdf76a798971b1c9644d7e74bac7e58c8d234b0650d49462b2ca9fa6cdf26c572da8cd680e8de62bd9cc14f65f97a180e',
					signSignature:
						'b8d0ab01ca30cd06f792fcc3e82ad1df451f6239fb470444d026c9e5b32fc9ccee3ab9deb398119b9d23ff76c3a807d210f32310a3b4c43e7ec3d7e05e6b6203',
					id: '14759833290133825198',
				},
				{
					type: 5,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						dapp: {
							category: 0,
							name: 'nryO',
							description: '7qs1Iv',
							tags: 'fZdhM1QGdTlJWjhSZzPsH',
							type: 0,
							link: 'OzG0whsxmEda24cfdA',
							icon: 'pMOY8WpXagaPdVptqR1prGPdM',
						},
					},
					signature:
						'bb5f425e4c7aeed0f4899b22692e240e22e41756cae85113c73a200cdc607005c28d218bd29de212d4b2c65919b174ea097719341f5f023ade9c26c90d75ea05',
					signSignature:
						'2597f3aa8afea57a1b8ab2328db3ee5abf315f0b367b686e50677da0ffabceee6694d9bb1c6613b7b218ee6c68ca5457261255dba185709fc44956a4eb523707',
					id: '12078587542208625234',
				},
				{
					type: 6,
					amount: '693810',
					fee: '10000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: { inTransfer: { dappId: '1000000' } },
					signature:
						'1fdab67596b6201fc73d741c1d5e0c0b8fa8536ce19fc8625a0cd41db84e97575e862037db1377cdd4b7d2520b0541fe52800117ae5297a42bb10de13b451b02',
					signSignature:
						'839c9397237065c0e676db1687ebf307c261382f34ac0c356d4a009d9f997c2bbeee0d48fa0ccd538543181efee63ce2810e9de144b13c1d5c78e95e8d097008',
					id: '9781155639793361245',
				},
				{
					type: 7,
					amount: '476088',
					fee: '10000000',
					recipientId: '1859190791819301L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						outTransfer: { dappId: '102606108', transactionId: '549685977' },
					},
					signature:
						'01c46d39654e2b7708c998fe813e32f37fe1fe9a3f6547faefcec8743392909f119a8c76a63cce76d2bf9969b7adb80c75d31c72e2f9f98aa6d9ac9418e07e0c',
					signSignature:
						'272815f308cabb04e4d8a817925758dc9d63e97425593c8e344089fead1936e6bcc51d3c49141fc97ea4eb7fbed67cd3f5bb89a979d121e174aaf526d23b210a',
				},
				{
					type: 0,
					amount: '2312331300000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196078,
					asset: {},
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					signature:
						'1cc982da7c70f06b32debb6bd3032c469a3ad5444b0257745297dbccf71050f382191e797daeb707a0eaba9286917fab90c5a37c8f2f49301febecc777c1eb0c',
					id: '8974713600754318131',
				},
				{
					type: 3,
					amount: '0',
					fee: '100000000',
					recipientId: '16313739661670634666L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						votes: [
							'+2af82af1fd00f4c0e36037e124309a083769e307025c10ff29c66cac577cafec',
							'+186521db6b809b250113a5bba66a1a6507251b8abba1d24f047b0984c050a1b5',
							'+28cf88ac965648c238a2fabb8ac7b8fe4aba6327bb32bcc6aa291a8ce59a4c78',
							'+77731ea9884dd4c684b7571b7e78b998fabbda4a66715854c40b7ee368ae446b',
							'-d6124c312884182d2fd4c51a829a480cb30d00052daf257d224e62ab1969d268',
						],
					},
					signature:
						'd0d603149cdac8ebd24d2617daca259d7cb0d7e14429421468e1a93f8c118e78ba78e0080e4b9b0d57daeefa0b973afff8cf2e984db2878730b5d868b3eabc09',
					id: '5300315452366475326',
				},
				{
					type: 2,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						delegate: {
							username: 'BmgeSxNgl7gWN4',
							publicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
					},
					signature:
						'ebc920b067e78f2350b7baceae66f4a74397912beed8ac9a8d1656fc28187b8849bbb593762b62843e7009cb15a626a7157eb3a0e6c828f69364932e8c0a2204',
					id: '14549490938474611289',
				},
				{
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						multisignature: {
							min: 2,
							lifetime: 1,
							keysgroup: [
								'+e64df51060a2ce43f91b24ae75cc83f1866f9fead2ca2420cf3df153e6368a97',
								'+4ef26ed51f4b82134b16f25a2556bed98a0b3963a17c0d2f0fa87f67cc6f29fe',
								'+818d34925549e0aea67f1b82190c3e288b1c66de95ce699c2f5c87f1e622012c',
								'+a2eece2bf0ee74e492939ac84723646270bfefab84914a5cf68baffd9bb84858',
								'+46f3ec44dbcffe28c6bcd4eb494ce24ceea51677eb67005bdd4dd3202db55251',
							],
						},
					},
					signature:
						'4c8a3bfaacfab18a7ef34ce8d7176ea2701dfd7221a1c95ecbc1cce778bbccdb7cbbe1a87b3e9e47330f1cae6665c4a44666e132aa324de9a5ab9b6a1e2b1d0c',
					id: '18066659039293493823',
				},
				{
					type: 5,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: {
						dapp: {
							category: 0,
							name: 'y2OPqyGLuw3F5u2Sxd',
							description: 'xBIt2niD',
							tags: 'qQvydic4uuw61X7a7cZ6tjrUKK2C',
							type: 0,
							link: 'MaRhi5E7G6EZu7dxaaE',
							icon: 'To900QF',
						},
					},
					signature:
						'a2910f485580a903e125b02198b0d9d8f2a9509bcd4e491932b2c30c06fad3d81969547f84073516ee24ce3036dbf388e63eede7e80848b555669c6d2392040b',
					id: '13459454681692221740',
				},
				{
					type: 6,
					amount: '166413',
					fee: '10000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196078,
					asset: { inTransfer: { dappId: '1000000' } },
					signature:
						'f2b1a66d9bd8ae0c1b3404fe397a11bd696e5aea274e6a8d9fea2f976503d006b8ca65484daf2498f854a0c0109b924b653a8d6ba31a568cb70727b7d3472902',
					id: '9501694969515165251',
				},
				{
					type: 7,
					amount: '835151',
					fee: '10000000',
					recipientId: '1859190791819301L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						outTransfer: { dappId: '614143983', transactionId: '749591467' },
					},
					signature:
						'646cd6cbe9f385bfa4f914b66a675a77080a3c1093278cfbca16d3d7fbf768350c9a7e270a8e5a72347e2792d3cfc770f3a3bb9ea542c300cba3976f34bd040e',
				},
				{
					type: 0,
					amount: '2801887300000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196079,
					asset: {},
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					signature:
						'be08dc16b70c47f58520f93599e72ad087d323adc312fc5cf89d57938f7a098686686551a834e52180e5b07a2b7339982581871b2da69f38fdf72df93c022901',
					signSignature:
						'f2367e1be7450922a72168390dc1e1dfa7e3a685bb4755938b7f0ff48c18bbda4a11ea3309aaeb2398a5b110ec341d7d0b30f0f9cf6337231936b444dd4bb502',
					id: '13907564008476426594',
				},
				{
					type: 3,
					amount: '0',
					fee: '100000000',
					recipientId: '16313739661670634666L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						votes: [
							'+6af5a4fdf2fdd10e565cd22dbc0bf942fa8c59786a29a4b3706ffe559331d636',
							'+5bc0c67294e9a5be07c00fe051a50409502a62aa87032b60e737a15d58449333',
							'+79d64906a7a4cf89736ad1fb1819aeb69b07982718b45b590b1102d2ee99c1cf',
							'+2b0acc7ba95b1971c60f9a6da39c947fb79a1c8b359b4f054c371d40541afaac',
							'-9e117730c9a4adf1f031d122635db1f84214690cd0632302103c682c2115074e',
						],
					},
					signature:
						'f47f4b4b5b58140281e5d61a279ff4d009004114261e3ff39a8aa6119e8de6e7975bd9b49eb10aef58edd81061f395141828e5c267131add7e50a02297e64207',
					signSignature:
						'95528967d585ec9a71352ce753fb5475e54c272102d6808eee4b99e6a64561806767b5bb1e5dbd7500ca46cdddecd1bab03e5507f4d70b5132afa04c7df47b0d',
					id: '408170376416400414',
				},
				{
					type: 2,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						delegate: {
							username: 'h9iWcquSm9iKpFw',
							publicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
					},
					signature:
						'e051ee9441a04d046d390e70e15eac640dbd0289a27c2e82942be648194b9684e9eb86c9ac19f50293567ab8238047abf2d04c73f52ae7ff03230016c840440c',
					signSignature:
						'25f2e872b5c20445e5c8551ae0488edf3773736f401052d3689b061c418a79f9563c0b388ba2432608a67ba57cc6e8d7292550a626ad3f1a7e29e4dab631890c',
					id: '8936243264570089909',
				},
				{
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						multisignature: {
							min: 4,
							lifetime: 30,
							keysgroup: [
								'+5bf096b1964c2a8035a1836e20aa72e775d8ed2d15b13b50c170da8f49e1c13b',
								'+7167b3f440be68d7811b054f90906c595ee127e26e146ca27ebf728449b9ba63',
								'+c472e853cf1e706c4e3025ec0300ed1fb03df590a7bdda8a0badca6888476591',
								'+7902cd178a000cb672530ff982276e1b2b94c845988ac773abd775e5fda04a4b',
								'+93d29f8c7663e4aa273176bb74e35cd8bd5e09b9688b8e5f21cbac93761e4bab',
							],
						},
					},
					signature:
						'615bfc47244237b3bb6eff7f032a4ba0530cce9ce1627f488b9075672383fff45b96641daaa715da37bba6c4b09ee12d77070e8a5c1493acc833d1806946c802',
					signSignature:
						'a29ce1c2f682f924a68f85083ea6934edab494a2a81ffc3aaf090ba3a9aefb692317c97a0ce7187b1bf9bbaedb71d5f440ccd986279bee280b16b2ff5efd1006',
					id: '718478589882001258',
				},
				{
					type: 5,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						dapp: {
							category: 0,
							name: '0REwN',
							description: 'J82zELUzEnV',
							tags: 'e',
							type: 0,
							link: 'kPfG6Bt',
							icon: 'ium',
						},
					},
					signature:
						'c15cc992aa2f1ac6effc00c894e98fce68ecece7bd4ac00664437ed711b8e1bf066ea433a613476767d14c85e1cab66d548fdec9fd56f96d1b112bee224c090c',
					signSignature:
						'01b142ee1ffe3dd466fe863557500296dfd8313d098ca4d1897167e3138556999f91f8f73d337b53371fc643f713fead0461a0d3b2416585d3ca236144d4f40b',
					id: '6479396717400039057',
				},
				{
					type: 6,
					amount: '270355',
					fee: '10000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: { inTransfer: { dappId: '1000000' } },
					signature:
						'8a22d0b245bccd8f53ea7acd9b137bc3c7ed76a666318e7969aee45e67e75ab552dff73ec7c95c0653c2308691d068499be792d7229507c23ddd6d126a905d00',
					signSignature:
						'a504c8a7ef794b6ec99aa9c914f9e562ce8e18a5797bdc92ff03a7cc479600e3f3d8cd2b3cf478b7006f996d174ceae94297568c27aab3c43c8925c1e760af08',
					id: '4482291724705265307',
				},
				{
					type: 7,
					amount: '621696',
					fee: '10000000',
					recipientId: '1859190791819301L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						outTransfer: { dappId: '31057994', transactionId: '377678276' },
					},
					signature:
						'8c9abc118100d6aa016acae15ed4d10ce168b3aab9cc7d25f3bde38f2f198a3fcb729f670bdfeaba1b8e5a73192d3e115fa174e784e224a61439c00f1fef1304',
					signSignature:
						'fdbab8d4029624fc82e372dae3ebc8636142b83e894c5c8c32f1b912a751b894640e0ed514b72ee1c67d8bcf6ee9ea140de7e45e58c849c16598ffe4dbb85b06',
				},
				{
					type: 0,
					amount: '5061165300000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196079,
					asset: {},
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					signature:
						'b2cef4445fc63d3100bfe4b8c5a3988962378d5f05f3f31a874545341d1421f40f6bede8195fb41de4998454510a578490dcbc5a646bcea75fe459b8be1c6002',
					id: '17133129148236935159',
				},
				{
					type: 3,
					amount: '0',
					fee: '100000000',
					recipientId: '16313739661670634666L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						votes: [
							'+be4bbac72323ecc09bfe619fa112c5dcd42191f28e1f60b6a51b84a95f248941',
							'+3180e1f79f626a2ebf2fc9bb4282c931becbd8858e49b370d00055a2d6b4a062',
							'+d47f95719687003314535dd710180f1ff0e152773a772c625212bb2f034b854a',
							'+7a9147a984e3555fad99d774a90831baba8cc2b2f4a7e06eb3f2be2f0d3cdb5f',
							'-cb201cd4887eb52834a1e1a7a59c9903393e1abe2b75d61db81ad4199bef49a0',
						],
					},
					signature:
						'ce02d218620a527f05baf1b3f125f46a0d5faefafc3bc359f0fd65511d3b406843cbee3a4d156669267d6510f870b5d359a07402f6f1695e5de4354822a6470c',
					id: '5473217291152754023',
				},
				{
					type: 2,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						delegate: {
							username: '6YGNabt2vP',
							publicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
					},
					signature:
						'219af05289f95a6c5c920760d77afa80c750f11f221d21b6ae47942391d83aace624edc3814655cebe77ae045613c8148cbda97b3cda95ea52e19349611e7103',
					id: '4535306837758230670',
				},
				{
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						multisignature: {
							min: 0,
							lifetime: 35,
							keysgroup: [
								'+cac3545e2fa5b9fe4a41a66ce86adbb0322587137e5289b06ba4527673a85574',
								'+09e85edafad8b6e6191e1d989c58c5825b0596d5d5f5598e854eeabdffd2a850',
								'+29d8260d35f110f33d988f6a23d29153c1a344a339894774690fb9b6b6bb494e',
								'+346719e114848b4fbf9839836ebeb066b2898d872aef0dd315594b83d2fca1a2',
								'+01b014d50765d9f705b720d6376c792afca3da4ba2798bc65626a97494579790',
							],
						},
					},
					signature:
						'5d2acb6cc15f8de7a2531ba6a1e7725d82d07789672605e286f4ff11a19e0fb69034411f99c66267ead9245ceee54977d46a5427bdf651f8277d6908d2fd5e03',
					id: '14026504139568973606',
				},
				{
					type: 5,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						dapp: {
							category: 0,
							name: 'mZDJS',
							description: 'O1sUrkoqguTAET3O7B',
							tags: 'r2r9zWXWF3faCg',
							type: 0,
							link: 'FYZZq0oT9i4UtRb3o7rLLKxQQFavCkrdgQ',
							icon: 'KgpJyKuT8AxYN9JQ',
						},
					},
					signature:
						'cb4bc3a6279b9b994ee182f3dd65628910b8e0570685797877bbb2ded9679b6b00c3a6113b034ac5bead165b78dfdc4bb71620e3f99daf871d9399758a9ba30b',
					id: '17759930910428062541',
				},
				{
					type: 6,
					amount: '825188',
					fee: '10000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: { inTransfer: { dappId: '1000000' } },
					signature:
						'ea3a2b7655d2be581f0c08af121ce114f5ffff7b3149727558f8c6775b266c738a7abc8f3fc2baa55d4f445f09ec206996f196a59c5f8502fc36121f9149ed0c',
					id: '6562982313425129534',
				},
				{
					type: 7,
					amount: '628348',
					fee: '10000000',
					recipientId: '1859190791819301L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196079,
					asset: {
						outTransfer: { dappId: '49615750', transactionId: '296407938' },
					},
					signature:
						'67d0443b82b67d4fc2c287c3241fe44c40f68fc2df14e30d3746e463df2b7533f0cb4b4bca055a3f767d07f81a84c5843ad4b346554bfbe9cb1244a69b345e0d',
				},
				{
					type: 0,
					amount: '4876278400000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196080,
					asset: {},
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					signature:
						'832fa468ebdad7a5accb6b16b8c82222f0a97bc00233451a89e18100dc22d9df2fc722a09549d3ef832d483c8e8c18e9765e963b5203a147c0c4b9236021cd06',
					id: '11425498570993926585',
				},
				{
					type: 3,
					amount: '0',
					fee: '100000000',
					recipientId: '16313739661670634666L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						votes: [
							'+bfabfacd8fbd8d8a8aa825c07344d627c8e5b548b3c8af0bf0c447aad509c1ca',
							'+01da309703eb58d4e6fd1ba576ea37bf9b1d40eae756907c14434e3922900e13',
							'+9f7744d69fad50a9f187a6bc7a2f9847aa70302cd11459a33d7278eb0cf14dea',
							'+2d417477f8d4690188fa277eef6a49b0386a4c2a68643e61ed507fa14c1157d5',
							'-d8e2228f3bf31ab2cd455b8d04df8f37139c725c5819b328492d6e6c7a3779fe',
						],
					},
					signature:
						'26e5a15fc5fe2e17cee68c61c73e2ca2b8c616cfcd6ae4aa9137f32bab7617bf11ba1ca41826c45244a47a0ff273c1e1eadaf24c88aeda67ff9993597ed0800b',
					id: '912105933902813252',
				},
				{
					type: 2,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						delegate: {
							username: 'a4axYoN',
							publicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
					},
					signature:
						'aa609c506bf96cd4c179cff4dacae3574ee84a075adc8b626181d7a357fa30498ac04ee4a536848674131a7629871c7e89c3d7cf5b98fe8bb0c84e7144da890f',
					id: '13972423096514804371',
				},
				{
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						multisignature: {
							min: 0,
							lifetime: 18,
							keysgroup: [
								'+740834a59435d283fd3fb30ad5d7cbde2550e82471b73abedcffb61eaa6298e4',
								'+9bc8972fb01b70eb4624df5d4d4c7c00a51fd73958c50efaefe55260889aedd6',
								'+66a68de8047bbe788f5ec5fbae6baf84c6438606f4e6fdf91b791113a0506ea6',
								'+5f7c4b9b6f976a400dba8d0cc7f904603ea4ffe1d8702c80576a396037c49970',
								'+4e4a6b5cf7b8840ba521dfae5914f55ec3805c7d5cf25dfbf44fac57f9c5f183',
							],
						},
					},
					signature:
						'57b54da646c7567df86fec60aa57a40bfadb6cdc65cccecfc442c822a7b0372f4958a280edd3fc2d83d38e2d3bf922a1da01249c500f0309a9638e941a21c501',
					id: '13916871066741078807',
				},
				{
					type: 5,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						dapp: {
							category: 0,
							name: 'WRZhl8',
							description: 'xpxq9w6h',
							tags: 'bC1605OZ6RgRRj2',
							type: 0,
							link: '2RKLfLCm13xX2eZ4WMoWBAAig6QioF',
							icon: 'Yht9kxY37iCys8FVaFgBqBlk8WG',
						},
					},
					signature:
						'6cf050d618b6dc8b5e993de10eeba304d6f77eaf62e7893d976bcbdacaa194b89bac3c5bddb6e81a5cface98dafdc9be5b971768acaf8e5a820d460933f49706',
					id: '13519964049473247354',
				},
				{
					type: 6,
					amount: '369464',
					fee: '10000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: { inTransfer: { dappId: '1000000' } },
					signature:
						'6042833a4578b512a0dc8451ad4a92aec63d684eb2ba4fd9602b4c7235ec72fac12bda1ff984132f7ec36c440a3f4b9f20c4634169309ed430f4434968fa8b03',
					id: '4907759462496699682',
				},
				{
					type: 7,
					amount: '426107',
					fee: '10000000',
					recipientId: '1859190791819301L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						outTransfer: { dappId: '170489289', transactionId: '11189562' },
					},
					signature:
						'fc703ab98d6f25eb9617fab51a22cebdc8e340047c0b600bbf0fb216f9ac73520b10bbc6375ee3eafceb3c459f57dd0b661b4c19d114364cefec6e964bad5b08',
				},
				{
					type: 0,
					amount: '7543868600000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196080,
					asset: {},
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					signature:
						'ce60ee3b844d3bbd8030b842ba9568c857e6de41aa2e19322ab6314b8e66afa419752816fd17ad88a75dc8ef763de782be68cc27d3d47e0b5cd63f38de6a2d0f',
					signSignature:
						'2d572dcce12b1e8acf7e46b0a40576d3408045fd4f7e432e4a1853f8092e387e322ad390e14f091176f6fd84bcb72b7011aecd9390230ea4a21db74546abc507',
					id: '6263613751669009115',
				},
				{
					type: 3,
					amount: '0',
					fee: '100000000',
					recipientId: '16313739661670634666L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						votes: [
							'+0b8a49bb952e5ed645cddb5fb9393c2f8a1be4f261c7623ce0ddb2b6b2a1be3e',
							'+9cc4e085fe359f20c110ce5cf2ff30ffb4d6d613922e31afd572693be8e3f8ba',
							'+d2133bd20300544bc4e16ba828223dd3d58955425634a2e2cd6762821f6176a2',
							'+f11575b059598ffb9f0505e72041d05c685f949c4cce46c4366f50177d97dfbf',
							'-cdfda7456076b9025b2964ef0679e8e1a5c3b8cd0d63345d7a05ac6faeea5f8b',
						],
					},
					signature:
						'88c499e3dd5e10fecb16a192df9f8c81c32e9a7d2ac1f473bb076c7598cb431b14eb17423bf9493d8b112ca74b7cf1c64caa4a044cbac35f895185906f1b6107',
					signSignature:
						'30dec17a7d2d0b13df25e958e66481407b87da3f35a9b8c7e93044dcb4cf13970491cf2d9b0778258865b051f8eb3b53b8e15a52d2cbdd48ed67ff2d55edec07',
					id: '15014970331019583344',
				},
				{
					type: 2,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						delegate: {
							username: 'L4cPrZgeE',
							publicKey:
								'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
					},
					signature:
						'9e3d66ed9ba75a26b7380e09c29c38670b09233b9ca01ba93233fb0ce38e1c1fc92d66577292d2d70738d756a544878e044c3f49eb0dce22ad3c85c6211b5f09',
					signSignature:
						'6ca1fe51268a786412f8f757d5fc0243f8ae00fa88812ae8501d399ed7e68326403fe68a508df4ab8ba48a98ac08d0f061ee21f5001f29cbc2f5343b0a66660f',
					id: '9014172721793470554',
				},
				{
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						multisignature: {
							min: 5,
							lifetime: 38,
							keysgroup: [
								'+617286b8de6ef7a91c7a0915a3c45ca9676216cbc8dc14bffa5e9022ea3a5683',
								'+8141def6de5e8c92843d2af9589cd2568f3bb5e475dae78d334abde60682695c',
								'+925e387ca6c63427391adb697273a4da8852944066ab33d50cb8e6279248427e',
								'+9645504d7e06135a7a5db072aef3a6d80bb7ec8ca8cb61bc8f369faaa05587a8',
								'+e1808d0e57e47bc1ffb21683c0bf98bbabe1c7e43d6bc6c2890a16d03543c100',
							],
						},
					},
					signature:
						'4a058d11726300ef0dd62941ce8f2ee861383f9448f17580826dcbef9cb62b0d953004eef3659a8b6d16bfd25b0732f93877f9b29e8828946ca849d9bb7b2d02',
					signSignature:
						'ac3a9eec518b8c725aa8f8620546001f72b3036078242ab0c7639b6d6891ba4330448cc3e4f5c31516e896af4c5fa998fc2ba2673655a4cfb76168c8785c9109',
					id: '2884334432991037421',
				},
				{
					type: 5,
					amount: '0',
					fee: '2500000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						dapp: {
							category: 0,
							name: 'OpwYfwHdAfO4ncn7D',
							description: 'Ds',
							tags: '1nkfYVcgsisKnXyn7k0',
							type: 0,
							link: 'WQDusb0DgH',
							icon: 'RPAFQsBIsE',
						},
					},
					signature:
						'524afb27d284e4e71ea44de9d23f9a1cd603f37f81a55187a61ca92391dce1994d2c4a5e3f0ae8490caac66da5125a0d03f30d0775592aa02d451a72e3ed9303',
					signSignature:
						'7043b795dab467e3d3239e7c379ee1b07914a8ba04e639bda406f6ed8810d75a7b4066ad5e90ef3c2030927b917e8492db59ffad017ce51878b7217b27d3a506',
					id: '7976119586785833934',
				},
				{
					type: 6,
					amount: '881374',
					fee: '10000000',
					recipientId: null,
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: { inTransfer: { dappId: '1000000' } },
					signature:
						'f9facd4dd0b278e3fdca44e6b5527ff4d71f65fb05d1a993cc094f7a6e08118d96ad9103c7577c9efff41d3deec08ffb06346ab27aeff800d499785b53bea40d',
					signSignature:
						'ddbe2671cb80cf478b581772242e20d49b8f88445928f8c685ea06a83733a7c7abec31c53f52f1962126abc6e1e03b2c8c7b881f6a3d6808496eb500498b730b',
					id: '10748675444711410396',
				},
				{
					type: 7,
					amount: '370999',
					fee: '10000000',
					recipientId: '1859190791819301L',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						outTransfer: { dappId: '763580659', transactionId: '89998498' },
					},
					signature:
						'8041323c405e23fc8ebaaf7ded1a61e1922c29643d6ab5cf536655fb69380d7e64a158198a21cd34faa06ed1777321f403421fe59fc1b4c40087c19ab47eda0c',
					signSignature:
						'177664c1e4afc88462f44f8af6192d36d435bf9457d2466e9ced8b52d44eb740be03232a6a9e0467762cf336bbd155fba04dd0a74cb7a6938ee976453bf6070b',
				},
			];
		});

		describe('#signTransaction', () => {
			describe('given a passphrase and a second passphrase', () => {
				const passphrase =
					'wagon stock borrow episode laundry kitten salute link globe zero feed marble';
				const secondPassphrase =
					'trouble float modify long valve group ozone possible remove dirt bicycle riot';

				describe('when tested on the first signature', () => {
					it('should create the same signature', done => {
						transactions.forEach(transaction => {
							const { signature } = transaction;
							const rawTx = Object.assign({}, transaction);
							delete rawTx.signature;
							delete rawTx.signSignature;
							signTransaction(rawTx, passphrase).should.be.equal(signature);
						});
						done();
					});
				});

				describe('when tested on the second signature', () => {
					it('should create the same signature', done => {
						transactions.forEach(transaction => {
							const { signSignature } = transaction;
							if (signSignature) {
								const rawTx = Object.assign({}, transaction);
								delete rawTx.signSignature;
								signTransaction(rawTx, secondPassphrase).should.be.equal(
									signSignature,
								);
							}
						});
						done();
					});
				});
			});
		});

		describe('#verifyTransaction', () => {
			describe('when executed', () => {
				const secondPublicKey =
					'f9666bfed9ef2ff52a04408f22f2bfffaa81384c9433463697330224f10032a4';
				it('should verify all the transactions', done => {
					transactions.forEach(transaction => {
						if (!transaction.signSignature) {
							verifyTransaction(transaction).should.be.equal(true);
						} else {
							verifyTransaction(transaction, secondPublicKey).should.be.equal(
								true,
							);
						}
					});
					done();
				});
			});
		});
	});
});
