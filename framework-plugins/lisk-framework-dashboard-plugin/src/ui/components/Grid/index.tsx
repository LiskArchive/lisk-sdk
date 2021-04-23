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
import styles from './Grid.module.scss';

type GridItemsAlignment = 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';

type GridJustify =
	| 'flex-start'
	| 'center'
	| 'flex-end'
	| 'space-between'
	| 'space-around'
	| 'space-evenly';

type TextAlign = 'center' | 'left' | 'right' | 'justify';

type GridSizes = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type GridSpacing = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type OverrideProps<M, N> = { [P in keyof M]: P extends keyof N ? N[P] : M[P] };

interface GridBaseProps {
	// Grid container props
	container?: undefined;
	fluid?: undefined;
	rowSpacing?: undefined;
	colSpacing?: undefined;
	spacing?: undefined;
	columns?: number;

	// Grid row props
	row?: undefined;
	rowBorder?: undefined;
	alignItems?: undefined;
	justify?: undefined;

	// Grid col props
	xs?: undefined;
	sm?: undefined;
	md?: undefined;
	lg?: undefined;
	xl?: undefined;
	textAlign?: undefined;
}

type GridContainerProps = OverrideProps<
	GridBaseProps,
	{
		// Grid container props
		container?: true;
		fluid?: boolean;
		rowSpacing?: GridSpacing;
		colSpacing?: GridSpacing;
		spacing?: GridSpacing;
		columns?: 12 | 15;
	}
>;

type GridRowProps = OverrideProps<
	GridBaseProps,
	{
		// Grid row props
		row?: true;
		rowBorder?: boolean;
		alignItems?: GridItemsAlignment;
		justify?: GridJustify;
	}
>;

type GridColProps = OverrideProps<
	GridBaseProps,
	{
		// Grid col props
		xs?: GridSizes;
		sm?: GridSizes;
		md?: GridSizes;
		lg?: GridSizes;
		xl?: GridSizes;
		textAlign?: TextAlign;
	}
>;

type GridProps = GridContainerProps | GridRowProps | GridColProps;

const Grid: React.FC<GridProps> = props => {
	const {
		alignItems,
		children,
		container,
		fluid,
		justify,
		textAlign,
		row,
		rowBorder,
		xs,
		sm,
		md,
		lg,
		xl,
	} = props;

	const columns = props.columns ?? 12;
	const rowSpacing = props.rowSpacing ?? props.spacing;
	const colSpacing = props.colSpacing ?? props.spacing;

	const classes = [
		container ? styles[`grid-${columns}`] : '',
		container && rowSpacing ? styles[`gridRowSpacing-${rowSpacing}`] : '',
		container && colSpacing ? styles[`gridColSpacing-${colSpacing}`] : '',

		// Row styling
		row ? styles.gridRow : '',
		fluid ? styles.gridFluid : '',
		row && justify ? styles[`gridRowJustify-${justify}`] : '',
		row && alignItems ? styles[`gridRowAlignItems-${alignItems}`] : '',
		row && rowBorder ? styles.gridRowBorder : '',

		// Column styling
		!row && !container ? styles.gridCol : '',
		!row && !container && textAlign ? styles[`gridColTextAlign-${textAlign}`] : '',
		!row && xl ? styles[`gridCol-xl-${xl}`] : '',
		!row && lg ? styles[`gridCol-lg-${lg}`] : '',
		!row && md ? styles[`gridCol-md-${md}`] : '',
		!row && sm ? styles[`gridCol-sm-${sm}`] : '',
		!row && xs ? styles[`gridCol-xs-${xs}`] : '',
	];

	return <div className={classes.filter(Boolean).join(' ')}>{children}</div>;
};

export default Grid;
