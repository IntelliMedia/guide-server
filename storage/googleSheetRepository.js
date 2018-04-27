'use strict';

const Repository = require('./repository');
const FileRepository = require('./fileRepository');
const rp = require('request-promise');

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
        return "https://docs.google.com/spreadsheets/d/" + id;
    }

    _getCsvExportUrl(id) {
        return this._getGoogleSheetUrl(id) + "/export?format=csv";
    }    
}

module.exports = GoogleSheetRepository;