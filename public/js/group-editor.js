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

    var e=document.getElementById("refreshed");
	if(e.value=="no") {
        e.value="yes";
    } else {
        e.value="no";
        location.reload();
    }

    var $TABLE = $('#table');
    var $SAVE_BTN = $('#save-btn');
    var $DUPLICATE_BTN = $('#duplicate-btn');
    var $DELETE_BTN = $('#delete-btn');
    var $CANCEL_BTN = $('#cancel-btn');

    var $CLEAR_CACHE_BTN = $('#clear-cache-btn');

    $('.table-add').click(function () {
        var $clone = $TABLE.find('tr.hide').clone(true).removeClass('hide table-line');
        $TABLE.find('table').append($clone);
    });

    $('.table-remove').click(function () {
        $(this).parents('tr').detach();
    });

    $('.view-link').click(function () {
        var googleDocId = $(this).parents('tr').find('td').eq(2).text().trim();
        submit("group/modify", "POST", extractGroup(), (response) => {
            window.location.href = "https://docs.google.com/spreadsheets/d/" + googleDocId;
        });
    });

    $('.table-up').click(function () {
        var $row = $(this).parents('tr');
        if ($row.index() === 1) return; // Don't go above the header
        $row.prev().before($row.get(0));
    });

    $('.table-down').click(function () {
        var $row = $(this).parents('tr');
        $row.next().after($row.get(0));
    });

    // A few jQuery helpers for exporting only
    jQuery.fn.pop = [].pop;
    jQuery.fn.shift = [].shift;

    $.ajaxSetup({
        headers:
        { 'X-CSRF-TOKEN': $("#csrf").text() }
    });

    $DUPLICATE_BTN.click(function () {
        console.info("Duplicate group");
        submit("group/duplicate", "POST", extractGroup());
    });

    $DELETE_BTN.click(function () {
        console.info("Delete group");

        var id = $('#id').text().trim();
        submit("group/" + id, "delete", null);
    });

    $CANCEL_BTN.click(function () {
        console.info("Cancel edit");
         window.location.href = document.baseURI + "groups";
    });

    $SAVE_BTN.click(function () {
        console.info("Save group");
        submit("group/modify", "POST", extractGroup());
    });

    $CLEAR_CACHE_BTN.click(function () {
        console.info("Clear cached files associated with this group");
        submit("group/clear-cache", "POST", extractGroup());
    });
}