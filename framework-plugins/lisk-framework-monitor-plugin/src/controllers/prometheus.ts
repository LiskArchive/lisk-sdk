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
import { BaseChannel } from 'lisk-framework';
import { SharedState, PeerInfo } from '../types';

interface PrometheusData {
	varName: string;
	help: string;
	type: string;
	value: number;
}

enum PROMETHEUS_TYPE {
	guage = 'guage',
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
		exportData += `# HELP ${param.help}\n# TYPE ${param.varName} ${param.type}\n${param.varName} ${param.value}\n\n`;
	}

	return exportData;
};

export const getData = (channel: BaseChannel, state: SharedState) => async (
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const connectedPeers: PeerInfo[] = await channel.invoke('app:getConnectedPeers');
		const disconnectedPeers: PeerInfo[] = await channel.invoke('app:getDisconnectedPeers');
		const nodeInfo: NodeInfo = await channel.invoke('app:getNodeInfo');

		const data: PrometheusData[] = [
			{
				help: 'Block Propagation',
				type: PROMETHEUS_TYPE.guage,
				value: state.blocks.averageReceivedBlocks,
				varName: 'avg_times_block_received',
			},
			{
				help: 'Transaction Propagation',
				type: PROMETHEUS_TYPE.guage,
				value: state.transactions.averageReceivedTransactions,
				varName: 'avg_times_transaction_received',
			},
			{
				help: 'Node Height',
				type: PROMETHEUS_TYPE.guage,
				value: nodeInfo.height,
				varName: 'node_height',
			},
			{
				help: 'Finalized Height',
				type: PROMETHEUS_TYPE.guage,
				value: nodeInfo.finalizedHeight,
				varName: 'finalized_height',
			},
			{
				help: 'Unconfirmed transactions',
				type: PROMETHEUS_TYPE.guage,
				value: nodeInfo.unconfirmedTransactions,
				varName: 'unconfirmed_transactions',
			},
			{
				help: 'Connected peers',
				type: PROMETHEUS_TYPE.guage,
				value: connectedPeers.length,
				varName: 'connected_peers',
			},
			{
				help: 'Disconnected peers',
				type: PROMETHEUS_TYPE.guage,
				value: disconnectedPeers.length,
				varName: 'disconnected_peers',
			},
			{
				help: 'Fork events',
				type: PROMETHEUS_TYPE.guage,
				value: state.forks.forkEventCount,
				varName: 'fork_events',
			},
		];

		res.status(200).json({ data: prometheusExporter(data), meta: {} });
	} catch (err) {
		next(err);
	}
};
