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
import { TableBody, TableHeader, Table } from '../Table';
import { Widget, WidgetHeader, WidgetBody } from '../widget';
import Text from '../Text';
import CopiableText from '../CopiableText';
import { NodeInfo, Transaction } from '../../types';
import styles from './TransactionWidget.module.scss';

interface WidgetProps {
	transactions: Transaction[];
	nodeInfo?: NodeInfo;
	title: string;
}

const getModuleAsset = (
	nodeInfo: NodeInfo | undefined,
	moduleID: number,
	assetID: number,
): string => {
	if (!nodeInfo) {
		return 'unknown';
	}
	const registeredModule = nodeInfo.registeredModules.find(rm => rm.id === moduleID);
	if (!registeredModule) {
		return 'unknown';
	}
	const registeredAsset = registeredModule.transactionAssets?.find(ta => ta.id === assetID);
	if (!registeredAsset) {
		return `${registeredModule.name}:unknown`;
	}
	return `${registeredModule.name}:${registeredAsset.name}`;
};

const TransactionWidget: React.FC<WidgetProps> = props => {
	const { transactions, title } = props;

	return (
		<Widget>
			<WidgetHeader>
				<Text type={'h2'}>{title}</Text>
			</WidgetHeader>
			<WidgetBody>
				<Table>
					<TableHeader sticky>
						<tr>
							<th className={styles.headerID}>
								<Text>Id</Text>
							</th>
							<th className={styles.headerSender}>
								<Text>Sender</Text>
							</th>
							<th className={styles.headerModule}>
								<Text>Module:Asset</Text>
							</th>
							<th className={styles.headerFee}>
								<Text>Fee</Text>
							</th>
						</tr>
					</TableHeader>
					<TableBody>
						{transactions.map(transaction => (
							<tr key={transaction.id}>
								<td>
									<CopiableText text={transaction.id}>{transaction.id}</CopiableText>
								</td>
								<td>
									<CopiableText text={transaction.senderPublicKey}>
										{transaction.senderPublicKey}
									</CopiableText>
								</td>
								<td>
									<Text>
										{getModuleAsset(props.nodeInfo, transaction.moduleID, transaction.assetID)}
									</Text>
								</td>
								<td>
									<Text>{transaction.fee}</Text>
								</td>
							</tr>
						))}
					</TableBody>
				</Table>
			</WidgetBody>
		</Widget>
	);
};

export default TransactionWidget;
