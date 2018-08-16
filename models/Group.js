const mongoose = require('mongoose');
const Repository = require('../storage/repository');

const tagsDocIdSchema = new mongoose.Schema({
  tags: String,
  googleSheetDocId: String
});

// NOTE: When add/removing properties update replace and clone methods below.
const groupSchema = new mongoose.Schema({
  name: String,
  cacheDisabled: Boolean,
  repositoryLinks: [tagsDocIdSchema]
}, { timestamps: true });

groupSchema.methods.replace = function(updatedGroup) {
      this.name = updatedGroup.name;
      this.cacheDisabled = updatedGroup.cacheDisabled;
      if (updatedGroup.hasOwnProperty("repositoryLinks") && updatedGroup.repositoryLinks != null) {
        this.repositoryLinks = updatedGroup.repositoryLinks;

        for (let repositoryLink of this.repositoryLinks) {
          if (repositoryLink.id == "new") {
            repositoryLink.id = mongoose.Types.ObjectId()
          }
        }
      } else {
        this.repositoryLinks = [];
      }
}

groupSchema.methods.clone = function() {
      var newGroup = Group.create();
      newGroup.name = this.name + " - copy";
      newGroup.name = this.cacheDisabled;

      for (let repositoryLink of this.repositoryLinks) {
        newGroup.repositoryLinks.push({
          tags: repositoryLink.tags,
          googleSheetDocId: repositoryLink.googleSheetDocId
        });
      }

      return newGroup;
}

// Returns as array of GoogleSheet IDs that contain ECD rules
groupSchema.methods.getCollectionIds = function(tags) {
      let idRepository = new Repository();
      idRepository.insert(this.repositoryLinks.map((c) => { return c.toObject(); }));
      let matchingIds = idRepository.filter(tags).map((c) => { return c.googleSheetDocId; })

      return matchingIds;
  }


const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
