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
import styles from './Widgets.module.scss';

interface Props {
	events: string[];
	onSelect: (eventName: string) => void;
	selected: string[];
}

interface EventData {
	name: string;
	data: Record<string, unknown>;
}

const RecentEventWidget: React.FC<Props> = props => {
	const [listOptions, setListOptions] = React.useState<SelectInputOptionType[]>([]);
	const [selectedEvents, setSelectedEvents] = React.useState<SelectInputOptionType[]>([]);
	const [recentEvents, setRecentEvents] = React.useState<EventData[]>([]);
	const subscribedCount = `Subscribed: ${selectedEvents.length}`;

	React.useEffect(() => {
		const events = props.events
			.map(e => ({
				label: e,
				value: e,
			}))
			.flat();

		setListOptions(events);
		setSelectedEvents(events.length ? [events[0]] : []);
	}, [props.events]);

	const handleSelect = (val: SelectInputOptionType[]) => {
		setSelectedEvents(val);
		// Need to handle the logic to show correct events data here
		setRecentEvents([
			{
				name: 'app:transaction:new',
				data: {
					transaction:
						'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a321e087812146ffcd8ad547d8a549a31b25236e322c781a52d851a04746573743a40eec2099c3a2224309337854f06bba033834d9742a946113fa83f0714077671a9f32680397abcf8875649c7deccbc743cc36bdb9cae4c85ed0ae5d91e7c5ca500',
				},
			},
			{
				name: 'app:chain:fork',
				data: {
					block:
						'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a321e087812146ffcd8ad547d8a549a31b25236e322c781a52d851a04746573743a40eec2099c3a2224309337854f06bba033834d9742a946113fa83f0714077671a9f32680397abcf8875649c7deccbc743cc36bdb9cae4c85ed0ae5d91e7c5ca500',
				},
			},
			{
				name: 'app:block:new',
				data: {
					block:
						'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a321e087812146ffcd8ad547d8a549a31b25236e322c781a52d851a04746573743a40eec2099c3a2224309337854f06bba033834d9742a946113fa83f0714077671a9f32680397abcf8875649c7deccbc743cc36bdb9cae4c85ed0ae5d91e7c5ca500',
				},
			},
			{
				name: 'app:transaction:new',
				data: {
					transaction:
						'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a321e087812146ffcd8ad547d8a549a31b25236e322c781a52d851a04746573743a40eec2099c3a2224309337854f06bba033834d9742a946113fa83f0714077671a9f32680397abcf8875649c7deccbc743cc36bdb9cae4c85ed0ae5d91e7c5ca500',
				},
			},
			{
				name: 'app:chain:fork',
				data: {
					block:
						'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a321e087812146ffcd8ad547d8a549a31b25236e322c781a52d851a04746573743a40eec2099c3a2224309337854f06bba033834d9742a946113fa83f0714077671a9f32680397abcf8875649c7deccbc743cc36bdb9cae4c85ed0ae5d91e7c5ca500',
				},
			},
			{
				name: 'app:block:new',
				data: {
					block:
						'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a321e087812146ffcd8ad547d8a549a31b25236e322c781a52d851a04746573743a40eec2099c3a2224309337854f06bba033834d9742a946113fa83f0714077671a9f32680397abcf8875649c7deccbc743cc36bdb9cae4c85ed0ae5d91e7c5ca500',
				},
			},
		]);
	};

	return (
		<Widget>
			<WidgetHeader>
				<Text type={'h2'}>{'Recent events'}</Text>
			</WidgetHeader>
			<div className={styles['recent-events-dropdown']}>
				<SelectInput
					multi
					options={listOptions}
					selected={selectedEvents}
					onChange={val => handleSelect(val)}
				/>
				<Text type={'h3'}>{subscribedCount}</Text>
			</div>
			<WidgetBody scrollbar size={'m'}>
				{recentEvents.map(({ name, data }, index) => (
					<Box mb={4} key={index}>
						<Text type={'h3'}>{name}</Text>
						<br />
						<Text type={'p'} color="yellow">
							{JSON.stringify(data, null, '\t')}
						</Text>
					</Box>
				))}
			</WidgetBody>
		</Widget>
	);
};

export default RecentEventWidget;
