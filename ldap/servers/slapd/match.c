/** BEGIN COPYRIGHT BLOCK
 * Copyright 2001 Sun Microsystems, Inc.
 * Portions copyright 1999, 2001-2003 Netscape Communications Corporation.
 * All rights reserved.
 * END COPYRIGHT BLOCK **/
/*
 * match.c
 *
 * routines to "register" matching rules with the server
 *
 *
 * 
 *
 */

#include "slap.h"


struct matchingRuleList *g_get_global_mrl(void);
void g_set_global_mrl(struct matchingRuleList *newglobalmrl);
int slapi_matchingrule_register(Slapi_MatchingRuleEntry *mrule);
int slapi_matchingrule_unregister(char *oid);
Slapi_MatchingRuleEntry *slapi_matchingrule_new(void);
void slapi_matchingrule_free(Slapi_MatchingRuleEntry **mrEntry,
			     int freeMembers);
int slapi_matchingrule_get(Slapi_MatchingRuleEntry *mr, int arg, void *value);
int slapi_matchingrule_set(Slapi_MatchingRuleEntry *mr, int arg, void *value);


static int _mr_alloc_new(struct matchingRuleList **mrl);

static struct matchingRuleList *global_mrl=NULL;

struct matchingRuleList* 
g_get_global_mrl(void)
{
    return global_mrl;
}

void 
g_set_global_mrl(struct matchingRuleList *newglobalmrl)
{
    global_mrl = newglobalmrl;
}

int
slapi_matchingrule_set(Slapi_MatchingRuleEntry *mr, int arg, void *value)
{
    if(NULL == mr) {
	return(-1);
    }
    switch(arg) {
    case SLAPI_MATCHINGRULE_NAME:
	{
	    mr->mr_name = (char *)value;
	    break;
	}
    case SLAPI_MATCHINGRULE_OID:
	{
	    mr->mr_oid = (char *)value;
	    break;
	}
    case SLAPI_MATCHINGRULE_DESC:
	{
	    mr->mr_desc = (char *)value;
	    break;
	}
    case SLAPI_MATCHINGRULE_SYNTAX:
	{
	    mr->mr_syntax = (char *)value;
	    break;
	}
    case SLAPI_MATCHINGRULE_OBSOLETE:
	{
	    mr->mr_obsolete = *((int *)value);
	    break;
	}
    default:
	{
	    break;
	}
    }
    return(0);
}

int
slapi_matchingrule_get(Slapi_MatchingRuleEntry *mr, int arg, void *value)
{
    if((NULL == mr) || (NULL == value)) {
	return(-1);
    }
    switch(arg) {
    case SLAPI_MATCHINGRULE_NAME:
	{
	    (*(char **)value) = mr->mr_name;
	    break;
	}
    case SLAPI_MATCHINGRULE_OID:
	{
	    (*(char **)value) = mr->mr_oid;
	    break;
	}
    case SLAPI_MATCHINGRULE_DESC:
	{
	    (*(char **)value) = mr->mr_desc;
	    break;
	}
    case SLAPI_MATCHINGRULE_SYNTAX:
	{
	    (*(char **)value) = mr->mr_syntax;
	    break;
	}
    case SLAPI_MATCHINGRULE_OBSOLETE:
	{
	    (*(int *)value) = mr->mr_obsolete;
	    break;
	}
    default:
	{
	    return(-1);
	}
    }
    return(0);
}

Slapi_MatchingRuleEntry *
slapi_matchingrule_new(void)
{
    Slapi_MatchingRuleEntry *mrEntry=NULL;
    mrEntry = (Slapi_MatchingRuleEntry *)
	slapi_ch_calloc(1, sizeof(Slapi_MatchingRuleEntry));
    return(mrEntry);
}

void
slapi_matchingrule_free(Slapi_MatchingRuleEntry **mrEntry,
			int freeMembers)
{
    if((NULL == mrEntry) || (NULL == *mrEntry)) {
	return;
    }
    if(freeMembers) {
	slapi_ch_free((void **)&((*mrEntry)->mr_name));
	slapi_ch_free((void **)&((*mrEntry)->mr_oid));
	slapi_ch_free((void **)&((*mrEntry)->mr_desc));
	slapi_ch_free((void **)&((*mrEntry)->mr_syntax));
	slapi_ch_free((void **)&((*mrEntry)->mr_oidalias));
    }
    slapi_ch_free((void **)mrEntry);
    return;
}

static int
_mr_alloc_new(struct matchingRuleList **mrl)
{
    if(!mrl) {
        return(-1);
    }
    *mrl = NULL;
    *mrl = (struct matchingRuleList *)
        slapi_ch_calloc(1, sizeof(struct matchingRuleList));
 
 
    (*mrl)->mr_entry = (Slapi_MatchingRuleEntry *)
        slapi_ch_calloc(1, sizeof(Slapi_MatchingRuleEntry));
    return(0);
}

#if 0
static int
_mr_free(struct matchingRuleList **mrl /*, int freeEntry */)
{
    slapi_ch_free((void **)mrl);
    return(0);
}
#endif

int slapi_matchingrule_register(Slapi_MatchingRuleEntry *mrule)
{
    struct matchingRuleList *mrl=NULL;
    struct matchingRuleList *newmrl=NULL;
    int rc=0;
    
    if(NULL == mrule) {
	return(-1);
    }
    if((rc = _mr_alloc_new(&newmrl)) != 0) {
        return(-1);
    }
    if(NULL != mrule->mr_name) {
	newmrl->mr_entry->mr_name =
	    slapi_ch_strdup((char *) mrule->mr_name);
    }
    if(NULL != mrule->mr_oid) {
	newmrl->mr_entry->mr_oid =
	    slapi_ch_strdup((char *) mrule->mr_oid);
    }
    if(NULL != mrule->mr_oidalias) {
	newmrl->mr_entry->mr_oidalias =
	    slapi_ch_strdup((char *) mrule->mr_oidalias);
    }
    if(NULL != mrule->mr_desc) {
	newmrl->mr_entry->mr_desc = 
	    slapi_ch_strdup((char *) mrule->mr_desc);
    }
    if(NULL != mrule->mr_syntax) {
	newmrl->mr_entry->mr_syntax = 
	    slapi_ch_strdup((char *) mrule->mr_syntax);
    }
    newmrl->mr_entry->mr_obsolete = mrule->mr_obsolete;

    for(mrl = g_get_global_mrl();
        ((NULL != mrl) && (NULL != mrl->mrl_next));
        mrl = mrl->mrl_next);

    if(NULL == mrl) {
        g_set_global_mrl(newmrl);
        mrl = newmrl;
    }
    mrl->mrl_next = newmrl;
    newmrl->mrl_next = NULL;
    return(LDAP_SUCCESS);
}

int slapi_matchingrule_unregister(char *oid)
{
    /* 
     * Currently, not implemented.
     * For now, the matching rules are read at startup and cannot be modified.
     * If and when, we do allow dynamic modifications, this routine will
     * have to do some work.
     */
    return(0);
}



