/** BEGIN COPYRIGHT BLOCK
 * Copyright 2001 Sun Microsystems, Inc.
 * Portions copyright 1999, 2001-2003 Netscape Communications Corporation.
 * All rights reserved.
 * END COPYRIGHT BLOCK **/
/*
 * slapd hashed password routines
 *
 */

#include <stdio.h>
#include <string.h>
#include <sys/types.h>

#include "pwdstorage.h"

int
clear_pw_cmp( char *userpwd, char *dbpwd )
{
    return( strcmp( userpwd, dbpwd ));
}

char *
clear_pw_enc( char *pwd )
{
    return( slapi_ch_strdup( pwd ));
}
