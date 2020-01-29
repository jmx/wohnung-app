module.exports = function (drive, folder, cb) {
  drive.files.list({
    pageSize: 50,
    fields: 'nextPageToken, files(id, name, description)',
    spaces: 'drive',
    q: `'${folder}' in parents`
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = res.data.files;
    if (files.length) {
      files.sort((a, b) => {
        a_order = 99;
        b_order = 99;
        if (a.description) {
          a_order = parseInt(a.description.split(" ")[0], 10);
        }
        if (b.description) {
          b_order = parseInt(b.description.split(" ")[0], 10);
        }
        return a_order - b_order;
      });

      let pdf_toc = files.reduce((memo, file) => {
        if (file.description) {
          [order, include, position, ...title] = file.description.split(" ");
          file.title = title.join(" ");
          if (include === "ja") {
            memo.included.push(file);
          } else {
            memo.excluded.push(file);
          }
        } else {
          memo.unknown.push(file)
        }
        return memo;
      }, {
        included: [],
        excluded: [],
        unknown: []
      });

      cb(pdf_toc);

    } else {
      console.log('No files found.');
    }
  });
}
