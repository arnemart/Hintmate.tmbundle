var hinter = process.env.TM_HINTMATE_HINTER || 'node_modules/.bin/jshint';
var spawn = require('child_process').spawn;

module.exports = {
    simple: function(source, cb) {
        hint(source, function(result) {
            cb(formatSimple(result));
        });
    },
    html: function(source, cb) {
        hint(source, function(result) {
            cb(formatHtml(result));
        });
    }
};

function hint(source, cb) {
    var called = false;
    var h = spawn(hinter, ['-'], {
        cwd: process.env.TM_BUNDLE_SUPPORT
    });
    h.stdout.on('data', function(data) {
        called = true;
        cb(parse(data.toString()));
    });
    h.on('close', function() {
        if (!called) {
            cb([]);
        }
    });
    h.stderr.on('data', function(data) {
        console.log('error', data.toString());
    });
    h.stdin.end(prepareSource(source));
}

var lineRegex = /^stdin: line (\d+), col (\d+), (.+)$/;

function parse(data) {
    return data.split('\n').slice(0, -2).reduce(function(memo, raw) {
        var matches = raw.match(lineRegex);
        if (matches) {
            memo.push({
                line: matches[1],
                col: matches[2],
                message: matches[3]
            });
        }
        return memo;
    }, []);
}

function stripEverythingButNewlines(text) {
    return text.replace(/.*/g, '');
}

function prepareSource(source) {
    // Strip out all HTML (leave only newlines)
    if (process.env.TM_SCOPE.match('text.html')) {
        return source.replace(/^(.|\r?\n)*?<script[^>]*\>/m, stripEverythingButNewlines)
            .replace(/<\/script[^>]*>(.|\r?\n)*?<script[^>]*\>/gm, stripEverythingButNewlines)
            .replace(/<\/script[^>]*>(.|\r?\n)*$/m, stripEverythingButNewlines);
    }
    return source;
}

function formatSimple(errors, limit) {
    if (limit === undefined) {
        limit = 5;
    }
    return errors.slice(0, limit).map(function(error) {
        return 'Line ' + error.line + ', col ' + error.col + ': ' + error.message;
    }).join('\n') + (errors.length > limit ? '\nFound ' + errors.length + ' errors total.' : '');
}

function wrapHtml(content) {
    return '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="UTF-8" />' +
    '<title>Hintmate</title>' +
    '<style type="text/css">' +
    'body { font-family: helvetica, sans-serif; background-color: #222; color: #ddd }' +
    'a, a:visited, a:active { color: white }' +
    'a { display: block; margin: 5px; padding: 6px 4px; border: 1px solid #444; border-radius: 5px; text-decoration: none; }' +
    '.dim { color: #999 }' +
    'ul { list-style-type: none; margin: 0; padding: 0 }' +
    '</style>' +
    '</head>' +
    '<body>' +

    content +

    '</body>' +
    '</html>';
}

function formatHtml(errors) {
    if (errors.length === 0) {
        return wrapHtml('<p>No errors!</p>');
    } else {
        return wrapHtml('<ul>' + errors.reduce(function(html, error) {
            return html + '<li><a href="txmt://open?url=file://' + process.env.TM_FILEPATH + '&line=' + error.line + '&column=' + error.col + '"><span class="dim">Line ' + error.line + ', col ' + error.col + ':</span> ' + error.message + '</a></li>';
        }, '') + '</ul>');
    }
}