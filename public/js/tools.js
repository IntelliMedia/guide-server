
function submit(path, action, group, callback) {
    $.ajax({
            url: document.baseURI + path,
            method: action,
            data: group,
            datatype: "json",
            success: function(data, textStatus) {
                if (!callback && data.redirect) {
                    // data.redirect contains the string URL to redirect to
                    window.location.href = data.redirect;
                } else if (callback) {
                    callback(data);
                }
                console.info(textStatus);
            },
            fail: function(jqXHR, textStatus) {
                console.error(textStatus);
            }
    });
}

function extractGroup() {
      var $rows = $('#table').find('tr:not(:hidden)');
      var modifiedChallenges = [];
    
      // Turn all existing rows into a loopable array
      $rows.each(function () {
        var $td = $(this).find('td');
        
        if ($td.length > 2) {
            modifiedChallenges.push(
                {
                    id: $td.eq(0).text().trim(),
                    tags: $td.eq(1).text().trim(),
                    googleSheetDocId: $td.eq(2).text().trim(),
                }
            );
        }
      });

      var group = {
        id: $('#id').text().trim(),
        name: $('#name').text().trim(),
        cacheDisabled: $('#cacheDisabled').is(":checked"),
        repositoryLinks: modifiedChallenges
      };

      return group;
}

window.onload = function() {
    try {
    console.info("Connect using socket.io");
    let socket = io.connect();
    socket.on('progress', (data) => {
      var progress = data.progress;
      if (progress < 100)
          $('#downloadZipFileProgress').text(progress.toFixed(2) + '%');
      else
          $('#downloadZipFileProgress').text('Finished downloading zip file');
    });
    } catch(err) {
        console.error("Unable to connect", err);
    }
}