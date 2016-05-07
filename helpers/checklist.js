var ip = require('ip');


/*
  checks, if ip is in list (e.g. whitelist, blacklist
  @param list an array of ip addresses
  @param addr the ip address to check
  @returns true if ip is in the list, false otherwise
*/
function CheckIpInList(list, addr, returnListIsEmpty)
  {
	returnListIsEmpty = returnListIsEmpty || true;
		
  if (!list._subNets)   // first call, create subnet list
    {
    list._subNets = [];
    for (var i=list.length-1; i>=0; i--) 
      {
      var entry = list[i];
      if (ip.isV4Format(entry))       // IPv4 host entry
        entry = entry + "/32";
      else if (ip.isV6Format(entry))  // IPv6 host entry
        entry = entry + "/128";   
      try
        {
        var subnet = ip.cidrSubnet(entry);
        list._subNets.push(subnet);
        }
      catch (err)
        {
				// entry was not a valid ip address, log an error? 
        }
      };
    }
  if (list._subNets.length==0)
    return returnListIsEmpty;
  
  // check subnets
  for (var i=0, n=list._subNets.length; i<n; i++) 
    if (list._subNets[i].contains(addr))
      return true;

  return false;  
  }

module.exports = CheckIpInList;
