'use strict';

describe('transport', function () {
	
	describe('Transport', function () {
		
		describe('library', function () {
			
			it('should assign logger');
			
			it('should assign db');
			
			it('should assign bus');
			
			it('should assign schema');
			
			it('should assign network');
			
			it('should assign balancesSequence');
			
			describe('should assign logic', function () {
				
				it('should assign block');
				
				it('should assign transaction');
				
				it('should assign peers');
			});
			
			describe('should assign config', function () {
				
				describe('should assign peers', function () {
					
					describe('should assign options', function () {
						
						it('should assing timeout');
					});
				});
			});
		});
		
		it('should set self to this');
		
		it('should set __private.broadcaster to a new instance of Broadcaster');
		
		it('should call callback with error = null');
		
		it('should call callback with self');
	});
	
	describe('__private', function () {
		
		describe('hashsum', function () {
			
			it('should return hash sum of given object');
		});
		
		describe('removePeer', function () {
			
			describe('when options.peer is undefined', function () {
				
				it('should call library.logger.debug with "Cannot remove empty peer"');
				
				it('should return false');
			});
			
			it('should call library.logger.debug');
			
			it('should call modules.peers.remove with options.peer');
		});
		
		describe('receiveSignatures', function () {
			
			it('should call async.series');
			
			describe('execute following functions one after another', function () {
				
				describe('validateSchema', function () {
					
					it('should call library.schema.validate with query');
					
					it('should call library.schema.validate with schema.signatures');
					
					describe('callback for library.schema.validate', function () {
						
						describe('when error is defined', function () {
							
							it('should call series callback with "Invalid signatures body"');
						});
						
						describe('when error is undefined', function () {
							
							it('should call series callback');
						});
					});
				});
				
				describe('receiveSignatures', function () {
					
					it('should call async.eachSeries with signatures');
					
					describe('loop through signatures', function () {
						
						it('should call __private.receiveSignature with signature');
						
						describe('callback of __private.receiveSignature', function () {
							
							describe('when error is defined', function () {
								
								it('should call library.logger.debug with err');
								
								it('should call library.logger.debug with signature');
							});
							
							it('should call eachSeries callback');
						});
					});
					
					it('should call series callback');
				});
			});
			
			describe('callback of async.series', function () {
					
				it('should call callback with error');
			});
		});
		
		describe('receiveSignature', function () {
			
			it('should call library.schema.validate with {signature: query}');
			
			it('should call library.schema.validate with shcema.signature');
			
			describe('callback of library.schema.validate', function () {
				
				describe('when error is defined', function () {
					
					it('should call callback with "Invalid signature body"');
				});
				
				it('should call modules.multisignatures.processSignature with query');
				
				describe('callback of modules.multisignatures.processSignature', function () {
					
					describe('when error is defined', function () {
						
					});
				});
			});
		});
	});
});