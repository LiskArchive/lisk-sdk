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
import { Widget, WidgetHeader, WidgetBody } from '../widget';
import Text from '../Text';
import SelectInput, { SelectInputOptionType } from '../input/SelectInput';
import { TextAreaInput } from '../input';
import Box from '../Box';
import Button from '../Button';

interface WidgetProps {
	actions: string[];
	onSubmit: (data: {
		action: string;
		keyValue: string;
	}) => void;
}

const CallActionWidget: React.FC<WidgetProps> = props => {
	const [listOptions, setListOptions] = React.useState<SelectInputOptionType[]>([]);
	const [selectedActions, setSelectedActions] = React.useState<SelectInputOptionType[]>([]);
	const [keyValue, setKeyValue] = React.useState('');

	React.useEffect(() => {
        const actions = props.actions.map(action => ({ label: action, value: action })).flat();
		setListOptions(actions);
		setSelectedActions(actions.length ? [actions[0]] : []);
	}, [props.actions]);

	const handleSubmit = () => {
		const actionName = selectedActions[0].value;

		console.info({ actionName });
        props.onSubmit({ action: actionName, keyValue });

	};

	return (
		<Widget>
			<WidgetHeader>
				<Text type={'h2'}>{'Call action'}</Text>
			</WidgetHeader>
			<WidgetBody>
				<Box mb={4}>
					<SelectInput
						options={listOptions}
						selected={selectedActions}
						onChange={val => setSelectedActions(val)}
					></SelectInput>
				</Box>

				<Box mb={4}>
					<TextAreaInput
						placeholder={'Key'}
						size={'l'}
						value={keyValue}
						onChange={val => setKeyValue(val)}
					></TextAreaInput>
				</Box>

				<Box textAlign={'center'}>
					<Button size={'m'} onClick={handleSubmit}>
						Submit
					</Button>
				</Box>
			</WidgetBody>
		</Widget>
	);
};

export default CallActionWidget;