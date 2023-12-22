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
import { Request, Response, NextFunction } from 'express';
import { Plugins } from 'lisk-sdk';
import { SharedState, PeerInfo } from '../types';
import { getBlockStats } from './blocks';
import { getTransactionStats } from './transactions';

interface PrometheusData {
	readonly metric: string;
	readonly label: string;
	readonly type: string;
	readonly values: ReadonlyArray<{
		readonly value: number;
		readonly key: string;
	}>;
}

enum PROMETHEUS_TYPE {
	gauge = 'gauge',
	counter = 'counter',
	histogram = 'histogram',
}

interface NodeInfo {
	readonly height: number;
	readonly finalizedHeight: number;
	readonly unconfirmedTransactions: number;
}

const prometheusExporter = (data: PrometheusData[]) => {
	let exportData = '';
	for (const param of data) {
		exportData += `# HELP ${param.metric} ${param.label}\n# TYPE ${param.metric} ${
			param.type
		}\n${param.values.reduce((val, el) => {
			// eslint-disable-next-line no-param-reassign
			val += `${param.metric}${el.key} ${el.value}\n`;

			return val;
		}, '')}\n`;
	}

	return exportData;
};

export const getData =
	(client: Plugins.BasePlugin['apiClient'], state: SharedState) =>
	async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const connectedPeers: PeerInfo[] = await client.invoke('network_getConnectedPeers');
			const disconnectedPeers: PeerInfo[] = await client.invoke('network_getDisconnectedPeers');
			const nodeInfo: NodeInfo = await client.invoke('system_getNodeInfo');
			const blockStats = await getBlockStats(client, state);
			const transactionStats = await getTransactionStats(client, state);

			const data: PrometheusData[] = [
				{
					label: 'Average number of times blocks received',
					type: PROMETHEUS_TYPE.gauge,
					metric: 'lisk_avg_times_blocks_received_info',
					values: [
						{
							key: '',
							value: blockStats.averageReceivedBlocks,
						},
					],
				},
				{
					label: 'Average number of times transactions received',
					type: PROMETHEUS_TYPE.gauge,
					metric: 'lisk_avg_times_transactions_received_info',
					values: [
						{
							key: '',
							value: transactionStats.averageReceivedTransactions,
						},
					],
				},
				{
					label: 'Node Height',
					type: PROMETHEUS_TYPE.gauge,
					metric: 'lisk_node_height_total',
					values: [
						{
							key: '',
							value: nodeInfo.height,
						},
					],
				},
				{
					label: 'Finalized Height',
					type: PROMETHEUS_TYPE.gauge,
					metric: 'lisk_finalized_height_total',
					values: [
						{
							key: '',
							value: nodeInfo.finalizedHeight,
						},
					],
				},
				{
					label: 'Unconfirmed transactions',
					type: PROMETHEUS_TYPE.gauge,
					metric: 'lisk_unconfirmed_transactions_total',
					values: [
						{
							key: '',
							value: nodeInfo.unconfirmedTransactions,
						},
					],
				},
				{
					label: 'Total number of peers',
					type: PROMETHEUS_TYPE.gauge,
					metric: 'lisk_peers_total',
					values: [
						{
							key: '{state="connected"}',
							value: connectedPeers.length,
						},
						{
							key: '{state="disconnected"}',
							value: disconnectedPeers.length,
						},
					],
				},
				{
					label: 'Fork events',
					type: PROMETHEUS_TYPE.gauge,
					metric: 'lisk_fork_events_total',
					values: [
						{
							key: '',
							value: state.forks.forkEventCount,
						},
					],
				},
			];

			res.set('Content-Type', 'text/plain');
			res.status(200).send(prometheusExporter(data));
		} catch (err) {
			next(err);
		}
	};
