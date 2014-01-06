var hinter = process.env.TM_HINTMATE_HINTER || process.env.TM_BUNDLE_SUPPORT + '/node_modules/.bin/jshint';
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var cwd = process.env.TM_PROJECT_DIRECTORY || process.env.TM_BUNDLE_SUPPORT;

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
    var args = ['-'];
    var config = process.env.TM_HINTMATE_CONFIG || findFile('.jshintrc', cwd);
    if (config) {
        args.unshift('--config', config);
    }
    var h = spawn(hinter, args, {
        cwd: cwd
    });
    if (process.env.TM_HINTMATE_TRANSFORM) {
        var t = spawn(process.env.TM_HINTMATE_TRANSFORM, [], {
            cwd: cwd
        });
        t.stdout.pipe(h.stdin);
        t.stdin.end(prepareSource(source));
    } else {
        h.stdin.end(prepareSource(source));
    }
    h.stdout.on('data', function(data) {
        called = true;
        cb(parse(data.toString()));
    });
    h.on('close', function() {
        if (!called) {
            cb([]);
        }
    });
}

var lineRegex = /^.*?: line (\d+), col (\d+), (.+)$/;

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

// Stolen from jshint cli.js
function findFile(name, dir) {
    dir = dir || process.cwd();

    var filename = path.normalize(path.join(dir, name));

    var parent = path.resolve(dir, "../");

    if (fs.existsSync(filename)) {
        return filename;
    }

    if (dir === parent) {
        return null;
    }

    return findFile(name, parent);
}