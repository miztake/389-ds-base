/** BEGIN COPYRIGHT BLOCK
 * Copyright 2001 Sun Microsystems, Inc.
 * Portions copyright 1999, 2001-2003 Netscape Communications Corporation.
 * All rights reserved.
 * END COPYRIGHT BLOCK **/
#ifndef __nsautherr_h
#define __nsautherr_h

/* Define error id codes */

/* Define error ids generated by nsumgmt.c */

/* userRename() */
#define NSAUERR1000	1000		/* insufficient dynamic memory */

/* userStore() */
#define NSAUERR1100	1100		/* insufficient dynamic memory */

/* Define error ids generated by nsgmgmt.c */

/* groupStore() */
#define NSAUERR2000	2000		/* insufficient dynamic memory */

/* Define error ids generated by nsadb.c */

/* nsadbOpen() */
#define NSAUERR3000	3000		/* invalid function argument */
#define NSAUERR3020	3020		/* insufficient dynamic memory */
#define NSAUERR3040	3040		/* create directory operation failed */
#define NSAUERR3060	3060		/* open directory operation failed */

/* nsadbOpenUsers() */
#define NSAUERR3200	3200		/* invalid function argument */
#define NSAUERR3220	3220		/* insufficient dynamic memory */
#define NSAUERR3240	3240		/* error opening user database */

/* nsadbOpenGroups() */
#define NSAUERR3300	3300		/* invalid function argument */
#define NSAUERR3320	3320		/* insufficient dynamic memory */
#define NSAUERR3340	3340		/* error opening group database */

#if defined(CLIENT_AUTH)
/* nsadbOpenClients() */
#define NSAUERR3400	3400		/* invalid function argument */
#define NSAUERR3420	3420		/* insufficient dynamic memory */
#define NSAUERR3430	3430		/* error initializing DB lock */
#define NSAUERR3440	3440		/* error opening group database */

/* nsadbPutUserByCert() */
#define NSAUERR3500	3500		/* invalid username length */
#define NSAUERR3520	3520		/* user-to-cert map already exists */

/* nsadbOpenCertUsers() */
#define NSAUERR3600	3600		/* error opening user-to-cert id DB */

/* nsadbFindCertUser() */
#define NSAUERR3700	3700		/* specified user name not found */

/* nsadbAddCertUser() */
#define NSAUERR3800	3800		/* error adding entry to database */

/* nsadbRemoveCertUser() */
#define NSAUERR3900	3900		/* error deleting entry in database */

#endif /*  defined(CLIENT_AUTH) */

/* Define error ids generated by nsamgmt.c */

/* nsadbRemoveUser() */
#define NSAUERR4000	4000		/* user name not found */

/* nsadbRemoveGroup() */
#define NSAUERR4100	4100		/* group name not found */

/* Define error codes */
#define NSAERRNOMEM	-1		/* insufficient dynamic memory */
#define NSAERRINVAL	-2		/* invalid function argument */
#define NSAERROPEN	-3		/* error opening database */
#define NSAERRMKDIR	-4		/* error creating database directory */
#define NSAERRNAME	-5		/* user or group name not found */
#define NSAERRPUT	-6		/* error writing record to database */
#define NSAERRCMAP	-7		/* certificate map already exists */
#define NSAERRDEL	-8		/* error deleting database entry */
#define NSAERRLOCK	-9		/* error initializing DB lock */

NSPR_BEGIN_EXTERN_C

/* Authentication facility name in nsuser.c */
extern char * NSAuth_Program;

    /* Functions in nsautherr.c */
extern NSAPI_PUBLIC void nsadbErrorFmt(NSErr_t * errp,
			  char * msgbuf, int maxlen, int maxdepth);

NSPR_END_EXTERN_C

#endif /* __nsautherr_h */
