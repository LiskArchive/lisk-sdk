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
import Select, { ValueType, ActionMeta, StylesConfig } from 'react-select';
import styles from './Input.module.scss';

export type SelectInputOptionType = { label: string; value: string };

interface SingleSelectProps {
	options: SelectInputOptionType[];
	multi: false;
	onChange?: (value: SelectInputOptionType) => void;
	selected?: SelectInputOptionType;
}

interface MultiSelectProps {
	options: SelectInputOptionType[];
	multi: true;
	onChange?: (value: SelectInputOptionType[]) => void;
	selected?: SelectInputOptionType[];
}

type Props = SingleSelectProps | MultiSelectProps;

const customSelectStyles: StylesConfig<SelectInputOptionType, boolean> = {
	container: (currentStyles, _state) => ({
		...currentStyles,
		minHeight: '40px',
		boxSizing: 'border-box',
		fontStyle: 'normal',
		fontWeight: 'normal',
		fontSize: '16px',
	}),
	valueContainer: (currentStyles, _state) => ({
		...currentStyles,
		minHeight: '40px',
	}),
	option: (currentStyles, state) => ({
		...currentStyles,
		background: state.isSelected || state.isFocused ? '#4070f4' : 'inherit',
	}),
	menu: (currentStyles, _state) => ({
		...currentStyles,
		color: '#ffffff',
		zIndex: 5,
	}),
	menuList: (currentStyles, _state) => ({
		...currentStyles,
		boxSizing: 'border-box',
		borderRadius: '3px',
		background: 'linear-gradient(180deg, #101c3d 0%, #0c152e 100%)',

		border: '1px solid rgba(223, 230, 242, 0.2)',

		':hover': {
			border: '1px solid #4070f4',
		},
	}),
	control: (currentStyles, _state) => ({
		...currentStyles,
		background: 'inherit',
		border: '1px solid rgba(223, 230, 242, 0.2)',
		boxSizing: 'border-box',
		borderRadius: '3px',

		':hover': {
			border: '1px solid #4070f4',
		},

		':focus': {
			border: '1px solid #4070f4',
		},
	}),
	indicatorsContainer: (currentStyles, _state) => ({
		...currentStyles,
		border: 'none',
	}),
	indicatorSeparator: (currentStyles, _state) => ({
		...currentStyles,
		display: 'none',
	}),
	dropdownIndicator: (currentStyles, _state) => ({
		...currentStyles,
		color: '#ffffff',
		cursor: 'pointer',
		':hover': {
			color: '#254898',
		},
	}),
	input: (currentStyles, _state) => ({
		...currentStyles,
		color: '#ffffff',
	}),
	singleValue: (currentStyles, _state) => ({
		...currentStyles,
		color: '#ffffff',
	}),
	multiValue: (currentStyles, _state) => ({
		...currentStyles,
		padding: '10px 15px 10px 15px',
		background: '#254898',
		borderRadius: '18px',
		height: '28px',
		alignItems: 'center',
		fontSize: '16px',
	}),
	multiValueLabel: (currentStyles, _state) => ({
		...currentStyles,
		color: '#ffffff',
		background: '#254898',
	}),
	clearIndicator: (currentStyles, _state) => ({
		...currentStyles,
		cursor: 'pointer',

		':hover': {
			color: '#254898',
		},
	}),
	multiValueRemove: (currentStyles, _state) => ({
		...currentStyles,
		color: '#ffffff',
		cursor: 'pointer',

		':hover': {
			color: '#101c3d',
		},
	}),
};

const SelectInput: React.FC<Props> = props => {
	const { options, multi } = props;
	const [value, setValue] = React.useState<ValueType<SelectInputOptionType, boolean>>(
		props.selected ?? [],
	);

	const onChangeHandler = (
		newValue: ValueType<SelectInputOptionType, boolean>,
		_actionMeta: ActionMeta<SelectInputOptionType>,
	) => {
		let updatedValue!: SelectInputOptionType | SelectInputOptionType[];

		if (newValue && multi) {
			updatedValue = newValue as SelectInputOptionType[];
		} else if (newValue && !multi) {
			updatedValue = newValue as SelectInputOptionType;
		}

		setValue(updatedValue);

		if (props.onChange) {
			props.onChange(updatedValue as SelectInputOptionType & SelectInputOptionType[]);
		}
	};

	return (
		<span className={styles.select}>
			<Select
				closeMenuOnSelect={!multi}
				isMulti={multi}
				options={options}
				value={value}
				onChange={onChangeHandler}
				styles={customSelectStyles}
			/>
		</span>
	);
};

export default SelectInput;
