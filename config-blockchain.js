const app = Application.defaultApplication(genesisBlockDevnet, {
    genesisConfig: {
      communityIdentifier: 'newChain',
      blockTime: 5,
      maxPayloadLength: 100 * 1024,
      minRemainingBalance: "5000000",
	  activeDelegates: 101,
	  standbyDelegates: 2,
	  delegateListRoundOffset: 2
    },
    ...
});
