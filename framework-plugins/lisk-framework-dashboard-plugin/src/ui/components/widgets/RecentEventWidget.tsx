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
import SelectInput, { SelectInputOptionType } from '../input/SelectInput';
import { Widget, WidgetHeader, WidgetBody } from '../widget';
import Text from '../Text';
import Box from '../Box';
import { EventData } from '../../types';
import styles from './Widgets.module.scss';

interface Props {
	events: string[];
	onSelect: (eventsName: string[]) => void;
	selected: string[];
	data: EventData[];
}
const listToEventObject = (list: string[]) => list.map(e => ({ label: e, value: e })).flat();

const RecentEventWidget: React.FC<Props> = props => {
	const [selectedEvents, setSelectedEvents] = React.useState<SelectInputOptionType[]>(
		listToEventObject(props.selected),
	);

	const handleSelect = (val: SelectInputOptionType[]) => {
		setSelectedEvents(val);
		props.onSelect(val.map(e => e.value));
	};

	return (
		<Widget>
			<WidgetHeader>
				<div className={styles['recent-events-heading']}>
					<Text type={'h2'}>{'Recent events'}</Text>
					<Text type={'h3'}>Subscribed: {selectedEvents.length}</Text>
				</div>
				<div className={styles['recent-events-dropdown']}>
					<SelectInput
						multi
						options={listToEventObject(props.events)}
						selected={selectedEvents}
						onChange={val => handleSelect(val)}
					/>
					<Text type={'h3'}>Subscribed: {selectedEvents.length}</Text>
				</div>
			</WidgetHeader>
			<WidgetBody scrollbar size={'m'}>
				{props.data.map(({ name, data }, index) => (
					<Box mb={4} key={index}>
						<Text type={'h3'}>{name}</Text>
						<br />
						<Text type={'p'} color="yellow">
							<pre className={styles['recent-events-data']}>{JSON.stringify(data, null, '\t')}</pre>
						</Text>
					</Box>
				))}
			</WidgetBody>
		</Widget>
	);
};

export default RecentEventWidget;
