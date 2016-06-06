#!/bin/bash

cd "$(cd -P -- "$(dirname -- "$0")" && pwd -P)"

export PATH="$(pwd)/bin:$(pwd)/pgsql/bin:$PATH"
export LD_LIBRARY_PATH="$(pwd)/pgsql/lib:$LD_LIBRARY_PATH"
