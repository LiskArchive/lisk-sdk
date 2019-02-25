/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import Axios from 'axios';
import { NETWORK } from '../constants';
import { LISK_TAR, LISK_TAR_SHA256 } from './utils';

export const getLatestVersion = async (url: string): Promise<string> => {
	try {
		const version = await Axios.get(url);

		return version.data.trim();
	} catch (error) {
		throw error;
	}
};

export interface ReleaseInfo {
	readonly liskTarSHA256Url: string;
	readonly liskTarUrl: string;
	readonly version: string;
}

export const getReleaseInfo = async (
	latestUrl: string,
	releaseUrl: string,
	network: NETWORK,
): Promise<ReleaseInfo> => {
	const version: string = await getLatestVersion(latestUrl);
	const liskTarUrl = `${releaseUrl}/${network}/${version}/${LISK_TAR(version)}`;
	const liskTarSHA256Url = `${releaseUrl}/${network}/${version}/${LISK_TAR_SHA256(
		version,
	)}`;

	return {
		version,
		liskTarUrl,
		liskTarSHA256Url,
	};
};
