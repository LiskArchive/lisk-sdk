# Lisk Build

## Linux

A Ubuntu Linux 16.04 LTS (base install) machine is assumed.

### Prerequisistes

The following packages must be installed to build releases with lisk-build:

```
sudo apt-get install autoconf build-essential git jq libtool moreutils python2.7 tcl8.5 wget zlib1g-dev
```

## MacOS

A nachine running macOS 10.12 or 10.13 is assumed.

### Prerequisites

The following packages must be installed to build releases with lisk-build:

Homebrew installation instructions can be found at [https://docs.brew.sh/Installation](https://docs.brew.sh/Installation).

```
brew install coreutils gpg2 jq moreutils
```

### How-To

```
make LISK_NETWORK=mainnet
```
