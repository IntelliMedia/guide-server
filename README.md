Guide
=====

This server is intended to provide intelligent tutoring system (ITS) functionality to the [Geniventure](https://concord.org/blog/tag/geniventure/) game-based learning environment.

This project was originally created using the [hackathon-starter](https://github.com/sahat/hackathon-starter) (boilerplate for **Node.js** web applications).

## Prerequisites

- [MongoDB](https://www.mongodb.org/downloads)
- [Node.js 10.15+](http://nodejs.org)
- Command Line Tools
 - <img src="http://deluge-torrent.org/images/apple-logo.gif" height="17">&nbsp;**Mac OS X:** [Xcode](https://itunes.apple.com/us/app/xcode/id497799835?mt=12) (or **OS X 10.9+**: `xcode-select --install`)
 - <img src="http://dc942d419843af05523b-ff74ae13537a01be6cfec5927837dcfe.r14.cf1.rackcdn.com/wp-content/uploads/windows-8-50x50.jpg" height="17">&nbsp;**Windows:** [Visual Studio](https://www.visualstudio.com/products/visual-studio-community-vs)
 - <img src="https://lh5.googleusercontent.com/-2YS1ceHWyys/AAAAAAAAAAI/AAAAAAAAAAc/0LCb_tsTvmU/s46-c-k/photo.jpg" height="17">&nbsp;**Ubuntu** / <img src="https://upload.wikimedia.org/wikipedia/commons/3/3f/Logo_Linux_Mint.png" height="17">&nbsp;**Linux Mint:** `sudo apt-get install build-essential`
 
 ## Windows Only
  - [OpenSSL](https://www.openssl.org/) - Needed to compile node-gyp on Windows.


## Running the Server

```bash
# Get the latest snapshot
git clone https://github.com/IntelliMedia/guide-server

# Change directory
cd Guide

# Install NPM dependencies
npm install

# Start the server
node guide.js
```

## Administering the Server

After the server is successfully started, use a web browser to navigate to the GUIDE ITS Node.js server. The first person to sign in through the web admin UI will be given admin privileges.

## Reset Database

```
mongo mongodb://localhost/guide --eval "db.dropDatabase()"
```

## Copyright

Copyright 2016 North Carolina State University

Licensed under the [Simplified BSD License](LICENSE.md)
