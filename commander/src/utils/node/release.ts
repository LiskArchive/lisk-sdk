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
import * as axios from 'axios';
import { NETWORK } from '../constants';
import { getSemver, liskTar, liskTarSHA256 } from './commons';

export const getLatestVersion = async (url: string): Promise<string> => {
	const version = await axios.default.get(url);

	return version.data.trim();
};

export interface ReleaseInfo {
	readonly liskTarSHA256Url: string;
	readonly liskTarUrl: string;
	readonly version: string;
}

export const getReleaseInfo = async (
	releaseUrl: string,
	network: NETWORK,
	version: string,
): Promise<ReleaseInfo> => {
	if (releaseUrl.search('.tar.gz') >= 0) {
		return {
			version: getSemver(releaseUrl),
			liskTarUrl: releaseUrl,
			liskTarSHA256Url: `${releaseUrl}.SHA256`,
		};
	}

	const urlPath = `${releaseUrl}/${network}/${version}`;
	const liskTarUrl = `${urlPath}/${liskTar(version)}`;
	const liskTarSHA256Url = `${urlPath}/${liskTarSHA256(version)}`;

	return { version, liskTarUrl, liskTarSHA256Url };
};
