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
						{transactions.map(transaction => (
							<tr>
								<td>
									<CopiableText text={transaction.id} type={'td'}>
										{transaction.id}
									</CopiableText>
								</td>
								<td>
									<CopiableText text={transaction.sender} type={'td'}>
										{transaction.sender}
									</CopiableText>
								</td>
								<Text type={'td'} key={transaction.moduleAsset}>
									{transaction.moduleAsset}
								</Text>
								<Text type={'td'} key={transaction.fee}>
									{transaction.fee}
								</Text>
							</tr>
						))}
					</TableBody>
				</Table>
			</WidgetBody>
		</Widget>
	);
};

export default TransactionWidget;
