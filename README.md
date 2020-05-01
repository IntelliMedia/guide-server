Guide
=====

This server is intended to provide intelligent tutoring system (ITS) functionality to the [Geniventure](https://concord.org/blog/tag/geniventure/) game-based learning environment.

This project was originally created using the [hackathon-starter](https://github.com/sahat/hackathon-starter) (boilerplate for **Node.js** web applications).

## Prerequisites

- [MongoDB 4.4](https://www.mongodb.org/downloads)
- [Node.js 10.15](https://nodejs.org/en/download/releases/)
- <img src="http://deluge-torrent.org/images/apple-logo.gif" height="17">&nbsp;**Mac OS X:**
  - [Xcode](https://itunes.apple.com/us/app/xcode/id497799835?mt=12) (or **OS X 10.9+**: `xcode-select --install`)
- <img src="http://dc942d419843af05523b-ff74ae13537a01be6cfec5927837dcfe.r14.cf1.rackcdn.com/wp-content/uploads/windows-8-50x50.jpg" height="17">&nbsp;**Windows:**
  - [Visual Studio](https://www.visualstudio.com/products/visual-studio-community-vs)
  - [OpenSSL 1.0.2u](https://slproweb.com/products/Win32OpenSSL.html)
- <img src="https://lh5.googleusercontent.com/-2YS1ceHWyys/AAAAAAAAAAI/AAAAAAAAAAc/0LCb_tsTvmU/s46-c-k/photo.jpg" height="17">&nbsp;**Ubuntu** / 
  - `sudo apt-get install build-essential`
 
 ## Windows Only
  - [OpenSSL](https://www.openssl.org/) - Needed to compile node-gyp on Windows.


## Running the Server

```bash
# Get the latest snapshot
git clone https://github.com/IntelliMedia/guide-server

# Change directory
cd guide-server

# Install NPM dependencies
npm install

# Start the server
node guide.js
```

## Administering the Server

After the server is successfully started, use a web browser to navigate to the GUIDE ITS Node.js server. The first person to sign in through the web admin UI will be given admin privileges.

## Reset Database (Development)

```
mongo mongodb://localhost/guide3 --eval "db.dropDatabase()"
```

## Configure Database (Production)

The following fields should be indexed for database performance:

| Collection | Indexed Fields |
| ----- | -------------- |
| sessions | { "id": 1 }, { "studentId": 1 } |
| students | { "id": 1 } |
| conceptobservations | { "studentId": 1 } |

## Copyright

Copyright 2016 North Carolina State University

Licensed under the [Simplified BSD License](LICENSE.md)
