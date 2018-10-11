const mongoose = require('mongoose');
const Student = require('./Student');

class Class {
  constructor(id) {
    this.id = id;
  }

  students() {
    return Student.find({'classId': this.id}).exec();
  }

  static allClasses() {
    return Student.find().distinct('classId').exec()
      .then((ids) => {
        let classes = [];
        if (ids) {
          ids.forEach((id) => classes.push(new Class(id)));
        }
        return classes.sort();
      })
      .catch((err) => {
        console.error('Unable to find or create session for: ' + session.id);
      });
  }
}

module.exports = Class;
