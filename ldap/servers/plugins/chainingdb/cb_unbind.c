/** BEGIN COPYRIGHT BLOCK
 * Copyright 2001 Sun Microsystems, Inc.
 * Portions copyright 1999, 2001-2003 Netscape Communications Corporation.
 * All rights reserved.
 * END COPYRIGHT BLOCK **/
#include "cb.h"

int
chainingdb_unbind( Slapi_PBlock *pb ) {

	/* Nothing to do because connection mgmt is stateless*/

	Slapi_Backend 	* be;
	cb_backend_instance * cb;

  	slapi_pblock_get( pb, SLAPI_BACKEND, &be );
        cb = cb_get_instance(be);

        cb_update_monitor_info(pb,cb,SLAPI_OPERATION_UNBIND);

        cb_send_ldap_result( pb, LDAP_SUCCESS, NULL, NULL, 0, NULL );
	return SLAPI_BIND_SUCCESS;
}
