const mongoose = require('mongoose');

const tagsDocIdSchema = new mongoose.Schema({
  tags: String,
  googleSheetDocId: String
});

const groupSchema = new mongoose.Schema({
  name: String,
  repositoryLinks: [tagsDocIdSchema]
}, { timestamps: true });

groupSchema.methods.replace = function(updatedGroup) {
      this.name = updatedGroup.name;
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

      for (let repositoryLink of this.repositoryLinks) {
        newGroup.repositoryLinks.push({
          tags: repositoryLink.tags,
          googleSheetDocId: repositoryLink.googleSheetDocId
        });
      }

      return newGroup;
}

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
