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
import Box from '../Box';
import Text from '../Text';
import Grid from '../Grid';
import CopiableText from '../CopiableText';

interface WidgetProps {
	scrollbar?: boolean;
	data: Record<string, string>[];
	header: string[];
	widgetTitle: string;
}

const TransactionWidget: React.FC<WidgetProps> = props => {
	if (props.data.length === 0) return null;

	const scrollbar = props.scrollbar ?? true;
	const { data, header, widgetTitle } = props;

	return (
		<Widget>
			<WidgetHeader>
				<Text type={'h2'}>{widgetTitle}</Text>
			</WidgetHeader>
			<WidgetBody>
				<TableHeader>
					{header.map(item => (
						<Box pr={4} pl={4} pt={4} pb={4} key={item}>
							<Text type={'th'} key={item}>
								{item}
							</Text>
						</Box>
					))}
				</TableHeader>
				<TableBody size={'m'} scrollbar={scrollbar}>
					{data.map(item => (
						<Grid rowNoWrap>
							<Grid>
								<CopiableText text={item.id} type={'p'}>
									{item.id}
								</CopiableText>
							</Grid>
							<Grid>
								<CopiableText text={item.sender} type={'p'}>
									{item.sender}
								</CopiableText>
							</Grid>
							<Grid>
								<Text type={'p'} key={item.moduleAsset}>
									{item.moduleAsset}
								</Text>
							</Grid>
							<Grid>
								<Text type={'p'} key={item.fee}>
									{item.fee}
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
