/** BEGIN COPYRIGHT BLOCK
 * Copyright 2001 Sun Microsystems, Inc.
 * Portions copyright 1999, 2001-2003 Netscape Communications Corporation.
 * All rights reserved.
 * END COPYRIGHT BLOCK **/
/********************************************************************
 *
 *      agtmmap.c: Memory Map interface for SNMP sub-agent for 
 * 		   Netscape Directory Server stats (for UNIX environment).
 *
 *      Revision History:
 *      07/22/97        Created                 Steve Ross
 *
 *
 **********************************************************************/
 

#include "agtmmap.h"
#ifndef  _WIN32
#include <sys/mman.h>
#include <unistd.h>
#else
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <time.h>
#include "nt/regparms.h"
#endif

#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>

#ifndef  _WIN32
agt_mmap_context_t 	mmap_tbl [2] = { {AGT_MAP_UNINIT, -1, (caddr_t) -1}, 
	 				 {AGT_MAP_UNINIT, -1, (caddr_t) -1} };
#else
agt_mmap_context_t 	mmap_tbl[2] = { {AGT_MAP_UNINIT, NULL, (caddr_t) -1, NULL}, 
					 {AGT_MAP_UNINIT, NULL, (caddr_t) -1, NULL} };
#endif /* ! _WIN32 */


/****************************************************************************
 *
 *  agt_mopen_stats () - open and Memory Map the stats file.  agt_mclose_stats() 
 * 			 must be called prior to invoking agt_mopen_stats() again.
 * Inputs: 	
 * 	statsfile ->  Name of stats file including full path or NULL. 
 * 	       	      If NULL, default (slapd.stats) is assumed.
 *	mode      ->  Must be one of O_RDONLY / O_RDWR.
 *		      O_RDWR creates the file if it does not exist.
 * Outputs:
 *	hdl	  ->  Opaque handle to the mapped file. Should be passed
 *		      Passed to a subsequent agt_mupdate_stats() or 
 *		      agt_mread_stats() or agt_mclose_stats() call.
 * Return Values:
 *		      Returns 0 on successfully doing the memmap or error codes 
 * 		      as defined in <errno.h>, otherwise.
 *
 ****************************************************************************/

int 
agt_mopen_stats (char * statsfile, int mode, int *hdl)
{
	caddr_t 	fp;
	char 		*path;
#ifndef  _WIN32
	int 		fd;
        char            *buf;
	int 		err;
	size_t		sz;
	struct stat     fileinfo;
#endif /*  _WIN32 */

	switch (mode)
	{
	     case O_RDONLY:
		  if (mmap_tbl [0].maptype != AGT_MAP_UNINIT)
		  {
			*hdl = 0;
			return (EEXIST); 	/* We already mapped it once */
		  }
		  break;

	     case O_RDWR:
		  if (mmap_tbl [1].maptype != AGT_MAP_UNINIT)
		  {
			*hdl = 1;
			return (EEXIST); 	/* We already mapped it once */
		  }
		  break;
		 
		default:
		  return (EINVAL);  	/* Invalid (mode) parameter */

	} /* end switch */


	if (statsfile != NULL)
	     path = statsfile;
	else
	     path = AGT_STATS_FILE;


#ifndef  _WIN32
	switch (mode)
	{
	     case O_RDONLY:
	           if ( (fd = open (path, O_RDONLY)) < 0 )
	           {
			err = errno;
#if (0)
			fprintf (stderr, "returning errno =%d from %s(line: %d)\n", err, __FILE__, __LINE__);
#endif
	                return (err);
                   }

		   fp = mmap (NULL, sizeof (struct agt_stats_t), PROT_READ, MAP_PRIVATE, fd, 0);

		   if (fp == (caddr_t) -1)
		   {
			err = errno;
			close (fd);
#if (0)
			fprintf (stderr, "returning errno =%d from %s(line: %d)\n", err, __FILE__, __LINE__);
#endif
			return (err);
		   }

		   mmap_tbl [0].maptype = AGT_MAP_READ;
		   mmap_tbl [0].fd 	= fd;
		   mmap_tbl [0].fp 	= fp;
		   *hdl = 0;
#if (0)
		   fprintf (stderr, "%s@%d> opened fp = %d\n",  __FILE__, __LINE__, fp);
#endif
		   return (0);
		   
	     case O_RDWR:
	           fd = open (path, 
			      O_RDWR | O_CREAT, 
			      S_IWUSR | S_IRUSR | S_IRGRP | S_IROTH);

	           if ( fd < 0 )
	           {
			err = errno;
#if (0)
			fprintf (stderr, "returning errno =%d from %s(line: %d)\n", err, __FILE__, __LINE__);
#endif
	                return (err);
                   }
		
		   fstat (fd, &fileinfo);

		   sz = sizeof (struct agt_stats_t);

		   if (fileinfo.st_size < sz)
		   {
			   /* Without this we will get segv when we try to read/write later */
			   buf = calloc (1, sz);
			   write (fd, buf, sz);
			   free (buf);
		   }

		   fp = mmap (NULL, sz, (PROT_READ | PROT_WRITE), MAP_SHARED, fd, 0);

		   if (fp == (caddr_t) -1)
		   {
			err = errno;
			close (fd);
#if (0)
			fprintf (stderr, "returning errno =%d from %s(line: %d)\n", err, __FILE__, __LINE__);
#endif
			return (err);
		   }

		   mmap_tbl [1].maptype = AGT_MAP_RDWR;
		   mmap_tbl [1].fd 	= fd;
		   mmap_tbl [1].fp 	= fp;
		   *hdl = 1;
		   return (0);

	} /* end switch */
#else

	switch (mode) {
		case O_RDONLY:
		{
			HANDLE	hFile = NULL;
			HANDLE	hMapFile = NULL;
		
			/* Open existing disk file for read */
			hFile = CreateFile(path, 
						GENERIC_READ | GENERIC_WRITE,
						FILE_SHARE_READ | FILE_SHARE_WRITE, 
						NULL, 
						OPEN_EXISTING,
						FILE_ATTRIBUTE_NORMAL, 
						NULL);
			if ( hFile == INVALID_HANDLE_VALUE || hFile == NULL ) return GetLastError();

			/* Create mapped file handle for reading */
			hMapFile = CreateFileMapping( hFile, NULL, PAGE_READONLY, 0,
						sizeof(struct agt_stats_t),
						NULL);
			if ( hMapFile == NULL ) {
				CloseHandle( hFile );
				return GetLastError();
			}

				/* Create addr ptr to the start of the file */
			fp = (caddr_t) MapViewOfFileEx( hMapFile, FILE_MAP_READ, 0, 0,
					sizeof(struct agt_stats_t), NULL );
			if ( fp == NULL ) {
				CloseHandle( hMapFile );
				CloseHandle( hFile );
				return GetLastError();
			}

			/* Fill in info on this opaque handle */
			mmap_tbl[0].maptype = AGT_MAP_READ;
			mmap_tbl[0].fd = hFile;
			mmap_tbl[0].fp = fp;
			mmap_tbl[0].mfh = hMapFile;
			*hdl = 0;
			return 0;
		}
		
		case O_RDWR:
		{
		
			HANDLE	hFile = NULL;
			HANDLE	hMapFile = NULL;
		
			hFile = CreateFile( path, 
						GENERIC_WRITE | GENERIC_READ,
						FILE_SHARE_READ | FILE_SHARE_WRITE, 
						NULL, 
						OPEN_ALWAYS,
						FILE_ATTRIBUTE_NORMAL, 
						NULL );
			if ( hFile == INVALID_HANDLE_VALUE || hFile == NULL ) return GetLastError();

			/* Create mapped file handle for reading */
			hMapFile = CreateFileMapping( hFile, NULL, PAGE_READWRITE, 0,
						sizeof(struct agt_stats_t),
						NULL );
			if ( hMapFile == NULL ) {
				CloseHandle( hFile );
				return GetLastError();
			}

				/* Create addr ptr to the start of the file */
			fp = (caddr_t) MapViewOfFileEx( hMapFile, FILE_MAP_ALL_ACCESS, 0, 0,
					sizeof(struct agt_stats_t), NULL );
			if ( fp == NULL ) {
				CloseHandle( hMapFile );
				CloseHandle( hFile );
				return GetLastError();
			}

			mmap_tbl[1].maptype = AGT_MAP_RDWR;
			mmap_tbl[1].fd = hFile;
			mmap_tbl[1].fp = fp;
			mmap_tbl[1].mfh = hMapFile;
			*hdl = 1;
			return 0;

		}
		

	}

#endif /* !__WINNT__ */

return 0;

}  /* agt_mopen_stats () */


/****************************************************************************
 *
 *  agt_mclose_stats () - Close the Memory Map'ed the stats file.
 *
 *
 * Inputs: 	
 *	hdl	  ->  Opaque handle to the mapped file. Should be have been 
 *		      returned by an earlier call to agt_mopen_stats().
 *		      
 * Outputs:	      <NONE>
 *		      
 * Return Values:
 *		      Returns 0 on normal completion or error codes 
 * 		      as defined in <errno.h>, otherwise.
 *
 ****************************************************************************/
int 
agt_mclose_stats (int hdl)
{
	if ( (hdl > 1) || (hdl < 0) )
	{
		return (EINVAL); 	/* Inavlid handle */
	}

	if (mmap_tbl [hdl].maptype == AGT_MAP_UNINIT)
	     return (0);

	if (mmap_tbl [hdl].fp > (caddr_t) 0)
	{
#ifndef  _WIN32
		munmap (mmap_tbl [hdl].fp, sizeof (struct agt_stats_t));
		mmap_tbl [hdl].fp = (caddr_t) -1;
		close (mmap_tbl [hdl].fd);
		mmap_tbl [hdl].fd = -1;
#else
		BOOL	bUnmapped;

		bUnmapped = UnmapViewOfFile( mmap_tbl[hdl].fp );
		if ( mmap_tbl[hdl].mfh ) CloseHandle( mmap_tbl[hdl].mfh );
		if ( mmap_tbl[hdl].fd ) CloseHandle( mmap_tbl[hdl].fd );

		mmap_tbl[hdl].fp = (caddr_t) -1;
		mmap_tbl[hdl].mfh = NULL;
		mmap_tbl[hdl].fd = NULL;
#endif /* ! _WIN32 */
		mmap_tbl [hdl].maptype = AGT_MAP_UNINIT;
		return (0);
	}

	return EINVAL;
}  /* agt_mclose_stats () */
