Guide
=====

This is a work-in-progress server that is intended to provide ntelligent tutoring system (ITS) functionality to the [Geniverse](https://geniverse-lab.concord.org/) game-based learning environment.

This project was originally created using the [hackathon-starter](https://github.com/sahat/hackathon-starter) (boilerplate for **Node.js** web applications).

## Prerequisites

- [MongoDB](https://www.mongodb.org/downloads)
- [Node.js 6.0+](http://nodejs.org)
- Command Line Tools
 - <img src="http://deluge-torrent.org/images/apple-logo.gif" height="17">&nbsp;**Mac OS X:** [Xcode](https://itunes.apple.com/us/app/xcode/id497799835?mt=12) (or **OS X 10.9+**: `xcode-select --install`)
 - <img src="http://dc942d419843af05523b-ff74ae13537a01be6cfec5927837dcfe.r14.cf1.rackcdn.com/wp-content/uploads/windows-8-50x50.jpg" height="17">&nbsp;**Windows:** [Visual Studio](https://www.visualstudio.com/products/visual-studio-community-vs)
 - <img src="https://lh5.googleusercontent.com/-2YS1ceHWyys/AAAAAAAAAAI/AAAAAAAAAAc/0LCb_tsTvmU/s46-c-k/photo.jpg" height="17">&nbsp;**Ubuntu** / <img src="https://upload.wikimedia.org/wikipedia/commons/3/3f/Logo_Linux_Mint.png" height="17">&nbsp;**Linux Mint:** `sudo apt-get install build-essential`
 - <img src="http://i1-news.softpedia-static.com/images/extra/LINUX/small/slw218news1.png" height="17">&nbsp;**Fedora**: `sudo dnf groupinstall "Development Tools"`
 - <img src="https://en.opensuse.org/images/b/be/Logo-geeko_head.png" height="17">&nbsp;**OpenSUSE:** `sudo zypper install --type pattern devel_basis`


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

## Copyright

Copyright 2016 North Carolina State University

Licensed under the [Simplified BSD License](LICENSE.md)
