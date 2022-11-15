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

import * as React from 'react';
import { Dialog, DialogBody, DialogHeader, DialogProps } from '../dialog';
import Text from '../Text';
import { NodeInfo } from '../../types';
import Grid from '../Grid';
import Box from '../Box';

interface NodeInfoDialogProps extends DialogProps {
	nodeInfo: NodeInfo;
}

const NodeInfoItem: React.FC<{ label: string; value: string }> = props => (
	<Grid md={6} xs={12}>
		<Box mb={2}>
			<Text type={'h3'}>{props.label}</Text>
		</Box>
		<Text>{props.value}</Text>
	</Grid>
);

const NodeInfoDialog: React.FC<NodeInfoDialogProps> = props => {
	const { nodeInfo, ...rest } = props;

	return (
		<Dialog {...rest}>
			<DialogHeader>
				<Text type={'h1'}>Node Info</Text>
			</DialogHeader>
			<DialogBody>
				<Grid container fluid spacing={3}>
					<Grid row>
						<NodeInfoItem label={'Version'} value={nodeInfo.version} />
						<NodeInfoItem label={'Network version'} value={nodeInfo.networkVersion} />
					</Grid>

					<Grid row>
						<NodeInfoItem label={'Network identifier'} value={nodeInfo.chainID} />
						<NodeInfoItem label={'Last block ID'} value={nodeInfo.lastBlockID} />
					</Grid>

					<Grid row>
						<NodeInfoItem label={'Syncing'} value={nodeInfo.syncing ? 'True' : 'False'} />
						<NodeInfoItem
							label={'Unconfirmed transactions'}
							value={nodeInfo.unconfirmedTransactions.toLocaleString()}
						/>
					</Grid>

					<Grid row>
						<NodeInfoItem
							label={'Block time'}
							value={nodeInfo.genesisConfig.blockTime.toLocaleString()}
						/>
						<NodeInfoItem label={'Chain ID'} value={nodeInfo.genesisConfig.chainID} />
					</Grid>

					<Grid row>
						<NodeInfoItem
							label={'Max transactions length'}
							value={nodeInfo.genesisConfig.maxTransactionsSize.toLocaleString()}
						/>
						<NodeInfoItem
							label={'BFT threshold'}
							value={nodeInfo.genesisConfig.bftThreshold.toLocaleString()}
						/>
					</Grid>
				</Grid>

				<Box mt={5}>
					<Text type={'h2'}>Base Fees</Text>
				</Box>
				<Grid container fluid spacing={3}>
					<Grid row rowBorder>
						<Grid xs={4}>
							<Text type={'h3'}>Module ID</Text>
						</Grid>
						<Grid xs={4}>
							<Text type={'h3'}>Asset ID</Text>
						</Grid>
						<Grid xs={4}>
							<Text type={'h3'}>Base Fee</Text>
						</Grid>
					</Grid>
				</Grid>
			</DialogBody>
		</Dialog>
	);
};

export default NodeInfoDialog;
