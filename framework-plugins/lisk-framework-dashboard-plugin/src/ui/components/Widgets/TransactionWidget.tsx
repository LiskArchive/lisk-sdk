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

interface WidgetProps {
	transactions: Record<string, string>[];
	title: string;
}

const TransactionWidget: React.FC<WidgetProps> = props => {
	const { transactions, title } = props;

	return (
		<Widget>
			<WidgetHeader>
				<Text type={'h2'}>{title}</Text>
			</WidgetHeader>
			<WidgetBody>
				<Table>
					<TableHeader>
						<Text type={'th'}>Id</Text>
						<Text type={'th'}>Sender</Text>
						<Text type={'th'}>Module:Asset</Text>
						<Text type={'th'}>Fee</Text>
					</TableHeader>
					<TableBody>
						{transactions.map((transaction, index) => (
							<tr key={index}>
								<td>
									<CopiableText text={transaction.id}>{transaction.id}</CopiableText>
								</td>
								<td>
									<CopiableText text={transaction.sender}>{transaction.sender}</CopiableText>
								</td>
								<td>
									<Text key={transaction.moduleAsset}>{transaction.moduleAsset}</Text>
								</td>
								<td>
									<Text key={transaction.fee}>{transaction.fee}</Text>
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
