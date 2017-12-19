#!/bin/bash
#
# LiskHQ/lisk/test.sh
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

# Exit on error
set -e

# Detect extent which to run suite(s)
if [[ $1 = "untagged" ]]; then
	# Untagged: Tests not tagged unstable or slow
	mocha_opts="--grep @unstable|@slow --invert"
elif [[ $1 = "unstable" ]]; then
	# Unstable: Tests tagged unstable
	mocha_opts="--grep @unstable"
elif [[ $1 = "slow" ]]; then
	# Slow: Tests tagged slow
	mocha_opts="--grep @slow"
elif [[ $1 = "extensive" ]]; then
	# Extensive: All tests regardless of tag
	mocha_opts=""
else
	echo "Invalid argument, <test-extent> can be one of untagged|unstable|slow|extensive"
	exit 1
fi

# Detect suite(s) to run
if [[ ! ($2 =~ file|unit|system|transport|api|all) ]]; then
	echo "Invalid argument, <test-suite> can be one of file|unit|system|transport|api|all"
	exit 1
fi

# Define mocha command for every suite
mocha_cmd="./node_modules/.bin/mocha $mocha_opts"

################################################################################

reset_data() {
	# Purge directories created by tests
	rm -rf ./dapps ./public/dapps ./public/images/dapps

	# Recreate database
	dropdb lisk_test || true
	createdb lisk_test || true

	# Reinstate config and genesisBlock data
	cp ./test/config.json ./test/genesisBlock.json .
}

setup_suite() {
	# Stop lisk
	pm2 --silent stop app.js || true

	# Reset data to clean state
	reset_data

	# Start lisk
	NODE_ENV="test" pm2 --silent start app.js
	sleep 3
}

teardown_suite() {
	# Stop lisk
	pm2 --silent stop app.js

	# Reset data to clean state
	reset_data
}

run_suite() {
	# Find *.js files and sort them
	files=$(find "$1" -name '*.js' | sort)

	# Iterate over each file and run it
	for file in $files; do
		if [[ -f "$file" ]]; then
			$mocha_cmd "$file"
		fi
	done
}

################################################################################

# ESlint
./node_modules/.bin/grunt eslint-nofix --verbose

# Confirm <test-extent> and <test-suite>
echo "Running $1 $2 tests..."

# Specific tests
if [[ $2 == "file" ]]; then
	setup_suite
	run_suite "${@:3}"
	teardown_suite
	exit 0 # Bye
fi

# Unit tests
if [[ $2 =~ all|unit ]]; then
	setup_suite
	run_suite "./test/unit"
	teardown_suite
fi

# Functional system tests
if [[ $2 =~ all|system ]]; then
	setup_suite
	run_suite "./test/system"
	teardown_suite
fi

# Functional transport tests
if [[ $2 =~ all|transport ]]; then
	setup_suite
	run_suite "./test/transport"
	teardown_suite
fi

# Functional API tests
if [[ $2 =~ all|api ]]; then
	setup_suite
	run_suite "./test/api"
	teardown_suite
fi
