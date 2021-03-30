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

const labels = [
	[
		{ field: 'version', label: 'Version' },
		{ field: 'networkVersion', label: 'Network version' },
	],
	[
		{ field: 'lastBlockId', label: 'Last block ID' },
		{ field: 'syncing', label: 'Syncing' },
	],
	[
		{ field: 'unconfirmedTransactions', label: 'Unconfirmed transactions' },
		{ field: 'blockTime', label: 'Block time' },
	],
	[
		{ field: 'communityIdentifier', label: 'Community identifier' },
		{ field: 'maxPayloadLength', label: 'Max payload length' },
	],
	[
		{ field: 'bftThreshold', label: 'BFT threshold' },
		{ field: 'minFeePerByte', label: 'Min fee per byte' },
	],
];

const NodeInfoDialog: React.FC<NodeInfoDialogProps> = props => {
	const { nodeInfo, ...rest } = props;

	return (
		<Dialog {...rest}>
			<DialogHeader>
				<Text type={'h1'}>Node Info</Text>
			</DialogHeader>
			<DialogBody>
				<Grid container fluid spacing={3}>
					{labels.map((group, index) => (
						<Grid row rowBorder={index !== labels.length - 1}>
							{group.map(field => (
								<Grid md={6} sm={12}>
									<Box mb={2}>
										<Text type={'h3'}>{field.label}</Text>
									</Box>
									<Text>
										{
											// eslint-disable-next-line no-nested-ternary
											typeof nodeInfo[field.field as keyof NodeInfo] !== 'boolean'
												? nodeInfo[field.field as keyof NodeInfo]
												: nodeInfo[field.field as keyof NodeInfo]
												? 'True'
												: 'False'
										}
									</Text>
								</Grid>
							))}
						</Grid>
					))}
				</Grid>

				<Box mt={5}>
					<Text type={'h2'}>Base Fees</Text>
				</Box>
				<Grid container fluid spacing={3}>
					<Grid row rowBorder>
						<Grid sm={4}>
							<Text type={'h3'}>Module ID</Text>
						</Grid>
						<Grid sm={4}>
							<Text type={'h3'}>Asset ID</Text>
						</Grid>
						<Grid sm={4}>
							<Text type={'h3'}>Base Fee</Text>
						</Grid>
					</Grid>

					{nodeInfo.fees.map((fee, index) => (
						<Grid row rowBorder={index !== nodeInfo.fees.length - 1}>
							<Grid sm={4}>
								<Text>{fee.moduleId}</Text>
							</Grid>
							<Grid sm={4}>
								<Text>{fee.assetId}</Text>
							</Grid>
							<Grid sm={4}>
								<Text>{fee.baseFee}</Text>
							</Grid>
						</Grid>
					))}
				</Grid>
			</DialogBody>
		</Dialog>
	);
};

export default NodeInfoDialog;
