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

type GridSizes = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type GridSpacing = 0 | 1 | 2 | 3 | 4 | 5;

interface LayoutProps {
	row?: boolean;
	rowBorder?: boolean;
	container?: boolean;
	fluid?: boolean;
	sm?: GridSizes;
	md?: GridSizes;
	lg?: GridSizes;
	xl?: GridSizes;
	offset?: GridSizes;
	spacing?: GridSpacing;

	// CSS properties
	alignItems?: GridItemsAlignment;
	justify?: GridJustify;
}

const Grid: React.FC<LayoutProps> = props => {
	const {
		alignItems,
		children,
		container,
		fluid,
		justify,
		row,
		rowBorder,
		spacing,
		sm,
		md,
		lg,
		xl,
		offset,
	} = props;

	const classes = [
		container ? styles.grid : '',
		container && spacing ? styles[`gridSpacing-${spacing}`] : '',

		// Row styling
		row ? styles.gridRow : '',
		fluid ? styles.gridFluid : '',
		row && justify ? styles[`gridRowJustify-${justify}`] : '',
		row && alignItems ? styles[`gridRowAlignItems-${alignItems}`] : '',
		row && rowBorder ? styles.gridRowBorder : '',

		// Column styling
		!row && xl ? styles[`gridCol-xl-${xl}`] : '',
		!row && lg ? styles[`gridCol-lg-${lg}`] : '',
		!row && md ? styles[`gridCol-md-${md}`] : '',
		!row && sm ? styles[`gridCol-sm-${sm}`] : '',

		// Column offset
		!row && !container ? styles.gridCol : '',
		!row && sm && offset ? styles[`gridCol-sm-offset-${offset}`] : '',
		!row && md && offset ? styles[`gridCol-md-offset-${offset}`] : '',
		!row && lg && offset ? styles[`gridCol-lg-offset-${offset}`] : '',
		!row && xl && offset ? styles[`gridCol-xl-offset-${offset}`] : '',
	];

	return <div className={classes.filter(Boolean).join(' ')}>{children}</div>;
};

export default Grid;
