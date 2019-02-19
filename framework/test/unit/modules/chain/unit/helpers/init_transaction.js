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
 */

'use strict';

const {
	TransferTransaction,
	SecondSignatureTransaction,
	DelegateTransaction,
	VoteTransaction,
	MultisignatureTransaction,
	DappTransaction,
	InTransferTransaction,
	OutTransferTransaction,
} = require('@liskhq/lisk-transactions');
const initTransaction = require('../../../../../../src/modules/chain/helpers/init_transaction');

describe('init transaction', async () => {
	it('should initialize a transfer transaction', async () => {
        const transfer = {
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
        };

        expect(initTransaction(transfer)).to.be.instanceof(TransferTransaction);
    });

    it('should initialize a second signature transaction', async () => {
        const secondSignature = {
            type: 1,
            amount: '0',
            fee: '500000000',
            recipientId: '',
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
        };

        expect(initTransaction(secondSignature)).to.be.instanceof(SecondSignatureTransaction);
    });

    it('should initialize a delegate transaction', async () => {
        const delegate = {
            type: 2,
            amount: '0',
            fee: '2500000000',
            recipientId: '',
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
        };

        expect(initTransaction(delegate)).to.be.instanceof(DelegateTransaction);
    });

    it('should initialize a vote transaction', async () => {
        const vote = {
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
        };

        expect(initTransaction(vote)).to.be.instanceof(VoteTransaction);
    });

    it('should initialize a multisignature transaction', async () => {
        const multisignature = {
            type: 4,
            amount: '0',
            fee: '3000000000',
            recipientId: '',
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
        };

        expect(initTransaction(multisignature)).to.be.instanceof(MultisignatureTransaction);
    });

    it('should initialize a dapp transaction', async () => {
        const dapp = {
            type: 5,
            amount: '0',
            fee: '2500000000',
            recipientId: '',
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
        };

        expect(initTransaction(dapp)).to.be.instanceof(DappTransaction);
    });

    it('should initialize an intransfer transaction', async () => {
        const intransfer = {
            id: '13847108354832975754',
            type: 6,
            timestamp: 60991500,
            senderPublicKey: '305b4897abc230c1cc9d0aa3bf0c75747bfa42f32f83f5a92348edea528850ad',
            senderId: '13155556493249255133L',
            recipientId: '',
            recipientPublicKey: '',
            amount: '500000000',
            fee: '10000000',
            signature: 'be015020b4a89a8cc36ab8ed0047a8138b115f5ce3b1cee35afa5af1e75307a77290bfd07ca7fcc8667cc0c22a83e48bf964d547b5decf662d2624642bd2320e',
            signatures: [],
            asset: {
                inTransfer: {
                    dappId: '13227044664082109069',
                },
            },
        };

        expect(initTransaction(intransfer)).to.be.instanceof(InTransferTransaction);
    });

    it('should initialize an outtransfer transaction', async () => {
        const outtransfer = {
            id: '2897056580360618798',
            type: 7,
            timestamp: 63897154,
            senderPublicKey: 'e65b98c217bfcab6d57293056cf4ad78bf45253ab56bc384aff1665cf3611fe9',
            senderId: '18237045742439723234L',
            recipientId: '18237045742439723234L',
            recipientPublicKey: 'e65b98c217bfcab6d57293056cf4ad78bf45253ab56bc384aff1665cf3611fe9',
            amount: '100000000',
            fee: '10000000',
            signature: '286934295859e8f196f00e216f5763cfa3313cc3023e4a34e9da559a96cfb7d7f1e950513b77ace49f56cab1b56b21b05e3183f04d4f389b0355e5b8e9072c08',
            signatures: [],
            asset: {
                outTransfer: {
                    dappId: '16337394785118081960',
                    transactionId: '12345678909876543213',
                },
            },
        };

        expect(initTransaction(outtransfer)).to.be.instanceof(OutTransferTransaction);
    });
});
