#1 Using MySQL from SWI-Prolog via ODBC on Mac OS (in early 2018)

I assume that you have working Homebrew installation.

## Install MySQL:

> $ brew install mysql

As the installation message shows, either you can start the server righ away by:

> $ mysql.server start

or make it restart at login:

> $ brew services start mysql

Let us start the server here.  Make sure that you can connect to it by:

> $ mysql -uroot

## Install drivers and related software:

Let us install, or upgrade unixODBC:

> $ brew install unixodbc

For connecitng to MS SQL Server, apparently you need to install freeTDS:

> $ brew install freetds --with-unixodbc

(FreeTDS may not be strictly needed but other documents mentions it, and during my exploration, I did install it.)

## Install iODBC
This may not be strictly needed, but it is mentioned in the page on dev.mysql.com. It set up two symbolic links from my home directory to ~/Library/ODBC for odbc.ini and odbcinst.ini.  It may or may not be important:

> http://www.iodbc.org/dataspace/doc/iodbc/wiki/iodbcWiki/Downloads#Mac%20OS%20X

This application crashes when you try to edit the configuration file with it, and in general it does not look useful.

## Install Connector/ODBC

Visit:

> https://dev.mysql.com/downloads/connector/odbc/

and choose the tar.gz archive. It says that the .dmg requires iODBC application, but I think you can just use the tar.gz file.

As the page:

> https://dev.mysql.com/doc/connector-odbc/en/connector-odbc-installation-binary-osx.html

suggests, extract contents from the tar.gz, and copy files into /usr/local/bin and /usr/local/lib.

> $ cp bin/* /usr/local/bin
> $ cp lib/* /usr/local/lib

and run the command myodbc-installer (now in /usr/local/bin):

myodbc-installer -a -d -n "MySQL ODBC 8.0 Driver" -t "Driver=/usr/local/lib/libmyodbc8w.so"

This updates the file `/Library/ODBC/odbcinst.ini`.  Some other instruction pages may suggest to edit files at /usr/local/etc, but that is for Linux and does not apply on Mac.

## Edit a user "Data Source" file.

If you want to do it with iODBC, launch	the "iODBC Administrator64" app, choose User DSN, and "Add".  You would want to add the DATABASE name in the created section in the ini file, but iODBC Administrator app crashes that point.  But you can go ahead and edit the .ini file with a text editor to add DATABASE line and some other lines such as TRACE in the created section.  In the end, what counts is to have a section like:

[mytest]
Driver      = /usr/local/lib/libmyodbc8w.so
Description = A Description of this data source
DATABASE    = my_database

in odbc.ini in Library/ODBC, or .odbc.ini in the home directory.


## Install swi-prolog with brew:

> brew install swi-prolog

(If you have an older installation, do `brew upgrade swi-prolog`.)

Now, you loosely follow what is described here:

> https://rlaanemets.com/post/show/swi-prolog-and-mysql-through-odbc

Namely:

> use_module(library(odbc)).

> odbc_connect(mytest, C, [user(your_user), password(your_password)]),
> odbc_query(C, 'SELECT * FROM my_table', Rows).

assuming that the Data Source Name is mytest, and there is a table called my_table.



