# Lisk Build

## Linux

Any sufficiently modern Linux distribution should be able to run the build;
however, only Ubuntu Linux 16.04 LTS is guaranteed to work.

### Prerequisistes

Assuming a Ubuntu Linux 16.04 LTS base installation, the following packages
must be installed:

```
sudo apt-get install autoconf build-essential git gnupg2 jq libtool moreutils python2.7 tcl8.5 wget zlib1g-dev
```

## MacOS

A machine running a 64 bit version of macOS is required. Only versions
`10.12` or `10.13` are officialy supported.

### Prerequisites

Assuming a macOS 10.13 machine with Homebrew installed (installation
instructions can be found at
[https://docs.brew.sh/Installation](https://docs.brew.sh/Installation))
the following packages must be installed:

```
brew install coreutils gpg2 jq moreutils
```

### Usage

```
make LISK_NETWORK=<mainnet|testnet>
```

`make clean` to remove build artifacts; `make mrproper` will additionally delete downloaded dependencies.

#### Examples

```
make LISK_NETWORK=mainnet
make LISK_NETWORK=testnet
```
