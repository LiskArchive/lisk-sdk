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

import { BlockHeader } from '@liskhq/lisk-chain';
import { bls, utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import {
	Certificate,
	UnsignedCertificate,
} from '../../../../../src/engine/consensus/certificate_generation/types';
import { MESSAGE_TAG_CERTIFICATE } from '../../../../../src/engine/consensus/certificate_generation/constants';
import { unsignedCertificateSchema } from '../../../../../src/engine/consensus/certificate_generation/schema';
import {
	verifyAggregateCertificateSignature,
	computeUnsignedCertificateFromBlockHeader,
	signCertificate,
	verifySingleCertificateSignature,
} from '../../../../../src/engine/consensus/certificate_generation/utils';
import { createFakeBlockHeader } from '../../../../../src/testing';
import { Validator } from '../../../../../src/engine/consensus/types';
import { BLS_PUBLIC_KEY_LENGTH } from '../../../../../src/engine/bft/constants';

describe('utils', () => {
	const chainID = Buffer.alloc(0);
	let unsignedCertificate: UnsignedCertificate;

	describe('computeCertificateFromBlockHeader', () => {
		let blockHeader: BlockHeader;
		let certificate: UnsignedCertificate;

		beforeEach(() => {
			blockHeader = createFakeBlockHeader({});
			certificate = computeUnsignedCertificateFromBlockHeader(blockHeader);
		});

		it('should return a certificate with proper parameters', () => {
			expect(certificate.blockID).toBe(blockHeader.id);
			expect(certificate.height).toBe(blockHeader.height);
			expect(certificate.stateRoot).toBe(blockHeader.stateRoot);
			expect(certificate.timestamp).toBe(blockHeader.timestamp);
			expect(certificate.validatorsHash).toBe(blockHeader.validatorsHash);
		});

		it('should throw error when stateRoot is undefined', () => {
			(blockHeader as any).stateRoot = undefined;

			expect(() => computeUnsignedCertificateFromBlockHeader(blockHeader)).toThrow(
				'stateRoot is not defined.',
			);
		});

		it('should throw error when validatorsHash is undefined', () => {
			(blockHeader as any).validatorsHash = undefined;

			expect(() => computeUnsignedCertificateFromBlockHeader(blockHeader)).toThrow(
				'validatorsHash is not defined.',
			);
		});
	});

	describe('signCertificate', () => {
		let privateKey: Buffer;

		let signature: Buffer;

		beforeEach(() => {
			privateKey = bls.generatePrivateKey(utils.getRandomBytes(32));
			unsignedCertificate = {
				blockID: Buffer.alloc(0),
				height: 1000,
				stateRoot: Buffer.alloc(0),
				timestamp: 10000,
				validatorsHash: Buffer.alloc(0),
			};
			const encodedCertificate = codec.encode(unsignedCertificateSchema, unsignedCertificate);
			signature = bls.signData(MESSAGE_TAG_CERTIFICATE, chainID, encodedCertificate, privateKey);
			(unsignedCertificate as any).aggregationBits = utils.getRandomBytes(4);
			(unsignedCertificate as any).signature = utils.getRandomBytes(4);
		});

		it('should sign certificate', () => {
			expect(signCertificate(privateKey, chainID, unsignedCertificate)).toEqual(signature);
		});
	});
	describe('verifySingleCertificateSignature', () => {
		let privateKey: Buffer;
		let publicKey: Buffer;
		let signature: Buffer;

		beforeEach(() => {
			privateKey = bls.generatePrivateKey(utils.getRandomBytes(32));
			publicKey = bls.getPublicKeyFromPrivateKey(privateKey);
			unsignedCertificate = {
				blockID: Buffer.alloc(0),
				height: 1030,
				stateRoot: Buffer.alloc(0),
				timestamp: 10300,
				validatorsHash: Buffer.alloc(0),
			};

			const encodedCertificate = codec.encode(unsignedCertificateSchema, unsignedCertificate);

			signature = bls.signData(MESSAGE_TAG_CERTIFICATE, chainID, encodedCertificate, privateKey);

			(unsignedCertificate as any).aggregationBits = utils.getRandomBytes(4);
			(unsignedCertificate as any).signature = utils.getRandomBytes(4);
		});

		it('should return true with proper parameters', () => {
			const isVerifiedSignature = verifySingleCertificateSignature(
				publicKey,
				signature,
				chainID,
				unsignedCertificate,
			);

			expect(isVerifiedSignature).toBeTrue();
		});

		it('should return false for wrong public key', () => {
			publicKey = utils.getRandomBytes(48);

			const isVerifiedSignature = verifySingleCertificateSignature(
				publicKey,
				signature,
				chainID,
				unsignedCertificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for wrong signature', () => {
			signature = utils.getRandomBytes(32);

			const isVerifiedSignature = verifySingleCertificateSignature(
				publicKey,
				signature,
				chainID,
				unsignedCertificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});
	});
	describe('verifyAggregateCertificateSignature', () => {
		let signedCertificate: Certificate;
		let privateKeys: Buffer[];
		let validators: Validator[];
		let threshold: bigint;
		let signatures: Buffer[];
		let pubKeySignaturePairs: { publicKey: Buffer; signature: Buffer }[];
		let aggregateSignature: Buffer;
		let aggregationBits: Buffer;

		beforeEach(() => {
			privateKeys = Array.from({ length: 103 }, _ =>
				bls.generatePrivateKey(utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH)),
			);
			validators = privateKeys.map(
				privateKey =>
					({ blsKey: bls.getPublicKeyFromPrivateKey(privateKey), bftWeight: BigInt(1) } as any),
			);

			threshold = BigInt(33);

			unsignedCertificate = {
				blockID: Buffer.alloc(0),
				height: 1030,
				stateRoot: Buffer.alloc(0),
				timestamp: 10300,
				validatorsHash: Buffer.alloc(0),
			};

			const encodedCertificate = codec.encode(unsignedCertificateSchema, unsignedCertificate);

			signatures = privateKeys.map(privateKey =>
				bls.signData(MESSAGE_TAG_CERTIFICATE, chainID, encodedCertificate, privateKey),
			);

			pubKeySignaturePairs = Array.from({ length: 103 }, (_, i) => ({
				publicKey: validators[i].blsKey,
				signature: signatures[i],
			}));

			({ aggregationBits, signature: aggregateSignature } = bls.createAggSig(
				validators.map(v => v.blsKey),
				pubKeySignaturePairs,
			));

			signedCertificate = {
				...unsignedCertificate,
				aggregationBits,
				signature: aggregateSignature,
			};
		});

		it('should return true for valid parameters', () => {
			const isVerifiedSignature = verifyAggregateCertificateSignature(
				validators,
				threshold,
				chainID,
				signedCertificate,
			);

			expect(isVerifiedSignature).toBeTrue();
		});

		it('should return false for one unmatching publicKey in keysList', () => {
			validators[102].blsKey = utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH);

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				validators,
				threshold,
				chainID,
				signedCertificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for below threshold certificate value', () => {
			threshold = BigInt(105);

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				validators,
				threshold,
				chainID,
				signedCertificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for missing aggregationBits', () => {
			delete (signedCertificate as any).aggregationBits;

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				validators,
				threshold,
				chainID,
				signedCertificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for missing signature', () => {
			delete (signedCertificate as any).signature;

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				validators,
				threshold,
				chainID,
				signedCertificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for wrong aggregationBits', () => {
			(signedCertificate as any).aggregationBits = utils.getRandomBytes(32);

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				validators,
				threshold,
				chainID,
				signedCertificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for wrong signature', () => {
			(signedCertificate as any).signature = utils.getRandomBytes(32);

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				validators,
				threshold,
				chainID,
				signedCertificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});
	});
});
