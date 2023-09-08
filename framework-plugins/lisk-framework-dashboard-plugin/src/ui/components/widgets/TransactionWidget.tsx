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
import { apiClient, transactions as txLib } from '@liskhq/lisk-client';
import { TableBody, TableHeader, Table } from '../Table';
import { Widget, WidgetHeader, WidgetBody } from '../widget';
import Text from '../Text';
import CopiableText from '../CopiableText';
import { Transaction } from '../../types';
import styles from './TransactionWidget.module.scss';

type Metadata = apiClient.APIClient['metadata'];

interface WidgetProps {
	transactions: Transaction[];
	metadata?: Metadata;
	title: string;
}

const getModuleAsset = (
	metadata: Metadata | undefined,
	module: string,
	command: string,
): string => {
	if (!metadata) {
		return 'unknown';
	}
	const registeredModule = metadata.find(rm => rm.name === module);
	if (!registeredModule) {
		return 'unknown';
	}
	const registeredCommand = registeredModule.commands.find(ta => ta.name === command);
	if (!registeredCommand) {
		return `${registeredModule.name}_unknown`;
	}
	return `${registeredModule.name}_${registeredCommand.name}`;
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
								<Text>ID</Text>
							</th>
							<th className={styles.headerSender}>
								<Text>Sender</Text>
							</th>
							<th className={styles.headerModule}>
								<Text>Module_Command</Text>
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
									<CopiableText text={transaction.id} />
								</td>
								<td>
									<CopiableText text={transaction.senderPublicKey} />
								</td>
								<td>
									<Text>
										{getModuleAsset(props.metadata, transaction.module, transaction.command)}
									</Text>
								</td>
								<td>
									<Text>{txLib.convertBeddowsToLSK(String(transaction.fee))}</Text>
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
