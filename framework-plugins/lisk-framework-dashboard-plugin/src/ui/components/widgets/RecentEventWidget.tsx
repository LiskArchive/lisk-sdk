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
import formatHighlight from 'json-format-highlight';
import SelectInput, { SelectInputOptionType } from '../input/SelectInput';
import { Widget, WidgetHeader, WidgetBody } from '../widget';
import Text from '../Text';
import Box from '../Box';
import { ParsedEvent } from '../../types';
import styles from './Widgets.module.scss';
import { jsonHighlight } from '../../utils/json_color';

interface Props {
	events: string[];
	onSelect: (eventsName: string[]) => void;
	selected: string[];
	data: ParsedEvent[];
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

	const showHighlightJSON = (data: Record<string, unknown>): string =>
		// eslint-disable-next-line
		formatHighlight(data, jsonHighlight);

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
				{props.data.map(({ module, name, data, height, index: eIndex, topics }) => (
					<Box mb={4} key={`${height}/${eIndex}`}>
						<Text type={'h3'} className={styles['recent-events-event-heading']}>
							{module}_{name} (height: {height} index: {eIndex} topics: {topics.join(', ')})
						</Text>
						<br />
						<pre className={styles['recent-events-code-block']}>
							<code dangerouslySetInnerHTML={{ __html: showHighlightJSON(data) }} />
						</pre>
					</Box>
				))}
			</WidgetBody>
		</Widget>
	);
};

export default RecentEventWidget;
