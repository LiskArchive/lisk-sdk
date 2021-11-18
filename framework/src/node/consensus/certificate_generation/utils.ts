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
import { Certificate } from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const computeCertificateFromBlockHeader = (_blockHeader: BlockHeader) => {};

export const signCertificate = (
	_sk: Buffer,
	_networkIdentifier: Buffer,
	_blockHeader: BlockHeader,
	// eslint-disable-next-line @typescript-eslint/no-empty-function
) => {};

export const verifySingleCertificateSignature = (
	_pk: Buffer,
	_signature: Buffer,
	_networkIdentifier: Buffer,
	_certificate: Certificate,
	// eslint-disable-next-line @typescript-eslint/no-empty-function
) => {};

export const verifyAggregateCertificateSignature = (
	_keysList: Buffer[],
	_weights: number[],
	_threshold: number,
	_networkIdentifier: Buffer,
	_certificate: Certificate,
	// eslint-disable-next-line @typescript-eslint/no-empty-function
) => {};
