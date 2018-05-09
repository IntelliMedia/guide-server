'use strict';

const Repository = require('./repository');
const FileRepository = require('./fileRepository');
const rp = require('request-promise');
const { URL } = require('url');

/**
 * A repository that loads collections of objects (represented as rows) from Google Sheets
 * unless there is a cached collection on the local filesystem.
 */
class GoogleSheetRepository extends FileRepository {  
    constructor(cacheDirectory, deserializer) {
        super(cacheDirectory, deserializer);
        this.deserializer = deserializer;
    }

    // collectionId is a Google Doc ID (e.g., 1ZieoXhkW_5V3BpuYGPszM038Bdn5Qe7ybCyuSrksMiA)
    loadCollectionAsync(collectionId) {
        console.info("GoogleSheetRepository.loadCollectionAsync");
        return super.loadCollectionAsync(collectionId)
            .catch((e) => {
                console.info("Unable to load " + collectionId + " from cache.");
                return this._loadCollectionFromGoogleSheetAsync(collectionId);
            })
    }

    _loadCollectionFromGoogleSheetAsync(collectionId) {   
        let docUrl = this._getGoogleSheetUrl(collectionId);
        let csvExportUrl = this._getCsvExportUrl(collectionId);
        let options = {
            method: "GET",
            uri: csvExportUrl,
            headers: {
                'User-Agent': 'Request-Promise'
            } 
        };

        let collectionObjs = [];
        let serializedCollection = null;
        return rp(options)
            .then((response) => {
                if (response.includes("Create a new spreadsheet and edit with others at the same time")) {
                    throw new Error("Unable to access Google Sheet. Change sharing options to allow 'anyone with the link' to view the spreadsheet.");
                }

                serializedCollection = response;
                return this.deserializer.convertToObjectsAsync(serializedCollection, docUrl);
            })
            .then((objs) => {
                collectionObjs = objs;
                // Cache collection to local filesystem
                return this.saveCollectionAsync(collectionId, serializedCollection); 
            })
            .then(() => {
                this.insert(collectionObjs);
            });
    }

    _getGoogleSheetUrl(id) {
        if (!id) {
            throw new Error("id not defined");
        }
        return "https://docs.google.com/spreadsheets/d/" + id;
    }

    // Override _getSource() so that local file cache points to the original Google Sheet
    _getSource(id) {
        let url = new URL(this._getGoogleSheetUrl(id));
        url.searchParams.append("cached", "true");
        return url.href;
    }

    _getCsvExportUrl(id) {
        return this._getGoogleSheetUrl(id) + "/export?format=csv";
    }    

    static sourceAsUrl(obj) {
        if (!obj.source || !obj.id) {
            throw new Error("Object must have 'source' and 'id' properties to create URL");
        }

        // NOTE: #gid portion is necessary for the range query parameter to highlight
        // the corresponding row.
        let url = new URL(obj.source);
        url.pathname = url.pathname + "/edit";
        url.searchParams.append("range", obj.id + ':' + obj.id);
        // Google Sheets requires #gid to follow the path and the URL class appends it
        // after the query string.
        // Also, Google Sheets requires a ':' in the range, and the URL class encodes it.
        return url.href.replace(url.pathname, url.pathname + "#gid=0").replace("%3A", ":");
    }
}

module.exports = GoogleSheetRepository;