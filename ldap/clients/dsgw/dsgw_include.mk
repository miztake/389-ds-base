#
# PROPRIETARY/CONFIDENTIAL. Use of this product is subject to
# license terms. Copyright � 2001 Sun Microsystems, Inc.
# Some preexisting portions Copyright � 2001 Netscape Communications Corp.
# All rights reserved.
# 

# These are macro definitions for use by components of the dsgw
DSGW_DEFAULT_LANG = en
DSGW_BASE_RELDIR = $(RELDIR)/clients/dsgw
DSGW_BIN_RELDIR = $(DSGW_BASE_RELDIR)/bin
DSGW_HTML_RELDIR = $(DSGW_BASE_RELDIR)/html
DSGW_CONF_RELDIR = $(DSGW_BASE_RELDIR)/config
DSGW_PBHTML_RELDIR = $(DSGW_BASE_RELDIR)/pbhtml
DSGW_PBCONF_RELDIR = $(DSGW_BASE_RELDIR)/pbconfig
DSGW_MAN_RELDIR = $(RELDIR)/manual/$(DSGW_DEFAULT_LANG)/slapd/gw/manual
DSGW_INFO_RELDIR = $(RELDIR)/manual/$(DSGW_DEFAULT_LANG)/slapd/gw/info

# generic target to be used to make any directory dependencies
$(DSGW_BIN_RELDIR) $(DSGW_HTML_RELDIR) $(DSGW_CONF_RELDIR) $(DSGW_PBHTML_RELDIR) \
	$(DSGW_PBCONF_RELDIR) $(DSGW_MAN_RELDIR) $(DSGW_INFO_RELDIR) \
	$(DSGW_CONF_RELDIR)/$(DSGW_DEFAULT_LANG) :
	mkdir -p $@
