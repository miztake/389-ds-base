/** BEGIN COPYRIGHT BLOCK
 * Copyright 2001 Sun Microsystems, Inc.
 * Portions copyright 1999, 2001-2003 Netscape Communications Corporation.
 * All rights reserved.
 * END COPYRIGHT BLOCK **/
/* vlv_key.h */


#if !defined(__VLV_KEY_H)
#define __VLV_KEY_H

struct vlv_key
{
    PRUint32 keymem;
    DBT key;
};

struct vlv_key *vlv_key_new();
void vlv_key_delete(struct vlv_key **p);
void vlv_key_addattr(struct vlv_key *p,struct berval *val);

#endif
