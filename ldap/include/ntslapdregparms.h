/** BEGIN COPYRIGHT BLOCK
 * Copyright 2001 Sun Microsystems, Inc.
 * Portions copyright 1999, 2001-2003 Netscape Communications Corporation.
 * All rights reserved.
 * END COPYRIGHT BLOCK **/
/******************************************************
 *
 *
 *  ntslapdregparms.h - NT Registry keys for Slapd.
 *
 ******************************************************/

#if defined( _WIN32 )

#if !defined( _NTSLAPDREGPARMS_H_ )
#define	_NTSLAPDREGPARMS_H_

#define COMPANY_KEY "SOFTWARE\\Netscape"
#define COMPANY_NAME		"Netscape Communications Corp."
#define PROGRAM_GROUP_NAME	"Netscape"
#define PRODUCT_NAME		"slapd"
#define PRODUCT_BIN			"ns-slapd"
#define SLAPD_EXE		    "slapd.exe"
#define SERVICE_EXE		    SLAPD_EXE
#define	SLAPD_CONF			"slapd.conf"
#define	MAGNUS_CONF			SLAPD_CONF
#define SLAPD_DONGLE_FILE	"password.dng"
#define DONGLE_FILE_NAME	SLAPD_DONGLE_FILE
#define PRODUCT_VERSION		"1.0"
#define EVENTLOG_APPNAME	"NetscapeSlapd"
#define DIRECTORY_SERVICE_PREFIX	"Netscape Directory Server "
#define SERVICE_PREFIX		DIRECTORY_SERVICE_PREFIX
#define CONFIG_PATH_KEY		"ConfigurationPath"
#define EVENTLOG_MESSAGES_KEY "EventMessageFile"
#define EVENT_LOG_KEY		"SYSTEM\\CurrentControlSet\\Services\\EventLog\\Application"
#define ADMIN_REGISTRY_ROOT_KEY "Admin Server"
#define SLAPD_REGISTRY_ROOT_KEY	"Slapd Server"
#define PRODUCT_KEY			SLAPD_REGISTRY_ROOT_KEY
#endif /* _NTSLAPDREGPARMS_H_ */

#endif /* _WIN32 */
