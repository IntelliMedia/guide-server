/**
 * GET /
 * Monitor page.
 */
exports.index = (req, res) => {
  res.render('monitor', {
    title: 'Monitor'
  });
};
