/** BEGIN COPYRIGHT BLOCK
 * Copyright 2001 Sun Microsystems, Inc.
 * Portions copyright 1999, 2001-2003 Netscape Communications Corporation.
 * All rights reserved.
 * END COPYRIGHT BLOCK **/

typedef union
#ifdef __cplusplus
	YYSTYPE
#endif
 {
  char *string;
  int  num;
} YYSTYPE;
extern YYSTYPE yylval;
# define DEF_C 257
# define DEF_CO 258
# define DEF_OU 259
# define DEF_CN 260
# define EQ_SIGN 261
# define DEF_START 262
# define DEF_L 263
# define DEF_E 264
# define DEF_ST 265
# define USER_ID 266
# define DEF_ID 267
