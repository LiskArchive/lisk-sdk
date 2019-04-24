#!/bin/bash
#
# LiskHQ/lisk-scripts/env.sh
# Copyright (C) 2017 Lisk Foundation
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
######################################################################

export NODE_ENV="production"

LISK_PATH=$( cd -P -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd -P )

export PATH="$LISK_PATH/bin:$LISK_PATH/pgsql/bin:$PATH"
export PM2_HOME=$LISK_PATH/.pm2
# LISK_NETWORK is set at build time
