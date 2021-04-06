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
import { TableBody, TableHeader } from '../Table';
import { Widget, WidgetHeader, WidgetBody } from '../widget';
import Text from '../Text';
import Grid from '../Grid';
import CopiableText from '../CopiableText';
import styles from './Widgets.module.scss';

interface WidgetProps {
	scrollbar?: boolean;
	transactions: Record<string, string>[];
	widgetTitle: string;
}

const TransactionWidget: React.FC<WidgetProps> = props => {
	if (props.transactions.length === 0) return null;

	const scrollbar = props.scrollbar ?? true;
	const { transactions, widgetTitle } = props;

	return (
		<Widget>
			<WidgetHeader>
				<Text type={'h2'}>{widgetTitle}</Text>
			</WidgetHeader>
			<WidgetBody>
				<div className={styles['table-container']}>
					<TableHeader>
						<Grid rowNoWrap>
							<Grid xs={3}>
								<Text type={'th'}>Id</Text>
							</Grid>
							<Grid xs={4}>
								<Text type={'th'}>Sender</Text>
							</Grid>
							<Grid xs={4}>
								<Text type={'th'}>Module:Asset</Text>
							</Grid>
							<Grid xs={1}>
								<Text type={'th'}>Fee</Text>
							</Grid>
						</Grid>
					</TableHeader>
				</div>
				<TableBody size={'m'} scrollbar={scrollbar}>
					{transactions.map((transaction, index) => (
						<Grid rowNoWrap key={index}>
							<Grid xs={3}>
								<CopiableText text={transaction.id} type={'p'}>
									{transaction.id}
								</CopiableText>
							</Grid>
							<Grid xs={4}>
								<CopiableText text={transaction.sender} type={'p'}>
									{transaction.sender}
								</CopiableText>
							</Grid>
							<Grid xs={4}>
								<Text type={'p'} key={transaction.moduleAsset}>
									{transaction.moduleAsset}
								</Text>
							</Grid>
							<Grid xs={1}>
								<Text type={'p'} key={transaction.fee}>
									{transaction.fee}
								</Text>
							</Grid>
						</Grid>
					))}
				</TableBody>
			</WidgetBody>
		</Widget>
	);
};

export default TransactionWidget;
