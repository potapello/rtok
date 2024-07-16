BASE_URL = 'https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1';

var xhr = new XMLHttpRequest();
const domParser = new DOMParser();

var maindiv = document.getElementById('imagebox');
var mainpic = null;

var preloadpic = new Image();

var loadtimeout = 0;
var timeoutfunc = () => {};
function addTimeout(func, time=5000) {
    timeoutfunc = func;
    loadtimeout = setTimeout(timeoutfunc, time);
};
function removeTimeout() {
    clearTimeout(loadtimeout);
    timeoutfunc = () => {}
};

function preloadFull(d=false) {
    if(d !== false) {
        if(d.slice(d.lastIndexOf('.')) != '.mp4') {
            preloadpic.src = d;
            preloadpic.onload = () => {
                setCourseDiv('Full loaded! Waiting for picture rate...');
                mainpic.src = String(preloadpic.src);
                maindiv.innerHTML = '';
                maindiv.appendChild(mainpic);
            }
        } else {
            setCourseDiv('Cannot load full (full is video file)')
        }
    } else {
        preloadpic.src = '';
        preloadpic.onload = () => {}
    }
};

function setCourseDiv(comment) {
    var div = document.getElementById('course');
    // var clr = load > 2 ? '#ccc' : '#f44'; 
    if(env.calibrate) {
        div.innerHTML = `
        <div style="margin: 8px;">
            <font color="#ccc" size="4">${comment}</font>
            <br>
            <font color="#aaa" size="4">Calibration! Good/Perfect images left: ${calibrate}</font>
        </div>`
    } else {
        div.innerHTML = `
        <div style="margin: 8px;">
            <font color="#ccc" size="4">${comment}</font>
            <br>
            <font color="#aaa" size="4" id="picrate">Current picture rating: ${env.lastrank} | Minimal: ${env.good} | Appropriate pics: ${getRatedCount()} / ${database.length-progress}</font>
            <br>
            <font color="#aaa" size="4">Progress: ${progress} | Page: ${env.page} | Views: ${env.views} | Bad skipped: ${env.bads}</font>
        </div>`
    }
};

var env = {
    started: false,
    request: false,
    //
    course: '',
    page: 0,
    saved: [],
    //
    good: 0,
    bad: -20,
    lastrank: 0,
    //
    bads: 0,
    views: 0,
    //
    tagpool: {},
    calibrate: true,
};

var calibrate = 15;
var database = [];
var progress = 0;
var buttons = {};

function loadButtons() {
    var bwid = Math.floor((style.image * 0.7) / 5);
    var bh = Math.floor(bwid / 2);
    document.getElementById('buttons').innerHTML = `
        <button style="border-color: yellow; width: ${bwid}px; height: ${bh}px; color: yellow; background-color: #330; font-size: large;" onclick="rateImage(2)">Perfect</button>
        <button style="border-color: lime; width: ${bwid}px; height: ${bh}px; color: lime; background-color: #030; font-size: large;" onclick="rateImage(1)">Good</button>
        <button style="border-color: lightblue; width: ${bwid}px; height: ${bh}px; color: lightblue; background-color: #003; font-size: large;" onclick="rateImage(0)">Skip</button>
        <button style="border-color: red; width: ${bwid}px; height: ${bh}px; color: red; background-color: #200; font-size: large;" onclick="rateImage(-1)">Bad</button>
        <button style="border-color: magenta; width: ${bwid}px; height: ${bh}px; color: magenta; background-color: #202; font-size: large;" onclick="rateImage(-2)">Disgusting</button>
    `
};
function hideButtons() {document.getElementById('buttons').innerHTML = ``};

function showOptions() {
    document.getElementById('other').innerHTML = `
        <font color="#aaa" size="4">Change minimal rating</font>
        <button onclick="updateMinrat(5)" style="width: 50px; height: 50px; padding: 6px; color: whitesmoke; background-color: #000; font-size: large;">+ 5</button>
        <button onclick="updateMinrat(1)" style="width: 50px; height: 50px; padding: 6px; color: whitesmoke; background-color: #000; font-size: large;">+ 1</button>
        <button onclick="updateMinrat(-1)" style="width: 50px; height: 50px; padding: 6px; color: whitesmoke; background-color: #000; font-size: large;">- 1</button>
        <button onclick="updateMinrat(-5)" style="width: 50px; height: 50px; padding: 6px; color: whitesmoke; background-color: #000; font-size: large;">- 5</button>
        <font color="#aaa" size="4" id="ratingComment">Appropriate pics: ???</font>
    `
};

function startTok() {
    console.log('Start Tok!');
    maindiv = document.getElementById('imagebox');
    maindiv.innerHTML = '';
    mainpic = document.createElement('img');
    //
    var query = document.getElementById('query').value;
    document.getElementById('initial').innerHTML = '';
    setCourseDiv('Starting...');
    // showOptions();
    //
    onloadPics = () => {
        var aboba = undefined;
        while(aboba === undefined) {
            aboba = database[Math.floor(Math.random() * (database.length - 0.001))]
        }
        setPicture(aboba)
    };
    sendXML(query)
};

function picResize(pic) {
    // var xdiff = pic.meta.size.x - style.width;
    // var ydiff = pic.meta.size.y - style.height * 0.75;
    // if(xdiff > 0 || ydiff > 0) {
    //     var scale = 1;
    //     console.log('rescailed from ', pic.meta.size.x, pic.meta.size.x)
    //     if(xdiff >= ydiff) {
    //         scale = style.width / pic.meta.size.x;
    //     } else {
    //         scale = (style.height * 0.75) / pic.meta.size.x;
    //     };
    //     pic.width = scale * pic.meta.size.x;
    //     pic.height = scale * pic.meta.size.y;
    //     console.log('... rescale to ', scale * pic.meta.size.x, scale * pic.meta.size.y)
    // }
    pic.width = style.image
};

function setPicture(picmeta) {
    preloadFull(false);
    setCourseDiv('Loading next image thumbnail...');
    addTimeout(() => {rateImage(0); console.warn('Skip picture by timeout (8s.)')}, 8000);
    
    mainpic.src = picmeta.thumb;
    mainpic.meta = picmeta;
    mainpic.onclick = () => {window.open(mainpic.meta.full)};

    mainpic.onload = () => {
        removeTimeout();
        env.views++;
        loadButtons();
        window.scroll(0,0);
        maindiv.innerHTML = '';
        setCourseDiv('Loading full...');

        mainpic.onload = () => {};
        picResize(mainpic);
        maindiv.appendChild(mainpic);
        preloadFull(picmeta.full)
    };

    // mainpic.onerror = (e) => {
    //     rateImage(0);
    //     console.warn(`Skip picture by error!`, e)
    // }
};

function sendXML(query=false) {
    query === false
    ? xhr.open('GET', `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&pid=${env.page}&limit=1000`)
    : xhr.open('GET', `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&limit=1000&tags=${query}`);
    xhr.responseType = 'document';
    xhr.onload = () => {
        xhr.response.querySelectorAll('post').forEach((e) => {
            var item = {};
            item.full = e.getAttribute('file_url');
            item.thumb = e.getAttribute('preview_url');
            item.tags = e.getAttribute('tags').split(' ');
            item.score = Number(e.getAttribute('score'));

            item.size = {};
            item.later = false;
            item.size.x = Number(e.getAttribute('width'));
            item.size.y = Number(e.getAttribute('height'));

            database.push(item)
        });
        onloadPics();
        env.page++
    };
    xhr.onerror = () => {
        console.error('Error with load pics... Try again after 5s.');
        setTimeout(() => {sendXML()}, 5000);
    }
    xhr.send()
};

function updateMinrat(value) {
    env.good += value;
    env.bad = env.good - 20;
    //  <font color="#aaa" size="4" id="picrate">Current picture rating: ${env.lastrank}</font>
    var div = document.getElementById('picrate');
    if(div != null) {
        document.getElementById('picrate').innerHTML = `Current picture rating: ${env.lastrank} | Minimal: ${env.good} | Appropriate pics: ${getRatedCount()} / ${database.length-progress}`
    }
};

function autoRating() {
    var div = (database.length-progress) / getRatedCount();
    while(div < 10) {
        env.good += 5;
        div = (database.length-progress) / getRatedCount()
    };
    while(div >= 10) {
        env.good -= 1;
        div = (database.length-progress) / getRatedCount()
    };
    // display new value
    updateMinrat(0)
};

function getRatedCount() {
    var count = 0;
    for(let i = progress; i < database.length; i++) {
        if(countTagRating(database[i].tags) >= env.good) {count++}
    };
    return count
};

function tagCounter(value) {
    var tags = JSON.parse(JSON.stringify(mainpic.meta['tags']));
    for(var t in tags) {
        var tag = tags[t]
        if(env.tagpool[tag] === undefined) {
            env.tagpool[tag] = value
        } else {
            env.tagpool[tag] += value
        }
    }
};

function countTagRating(tags) {
    var rating = 0;
    for(var t in tags) {
        if(env.tagpool[tags[t]] !== undefined) {
            rating += env.tagpool[tags[t]]
        }
    };
    env.lastrank = rating;
    return rating
};

function filterBaseFrom() {
    while(progress < database.length) {
        // skip deleted pics
        if(database[progress] !== undefined) {
            var p = database[progress];
            var rating = countTagRating(p.tags);
            // skip later pics
            if(!p.later) {
                // delete if bad, return if good
                if(rating < env.good) {
                    env.bads++;
                    if(rating <= env.bad) {delete database[progress]}
                } else {
                    return p
                }
            };
        };
        progress++
    };
    return false
};

function getNextImage(afterload=true) {
    var first = filterBaseFrom();
    if(first === false) {
        console.log('No first try');
        // if get next after append database
        if(afterload) {
            console.log('Load new pics by afterload...');
            loadNewPics(getNextImage); return
        } else {
            // if get next after some iteration
            if(progress >= 1000 + 1000*env.page) {progress -= 1000};
            var second = filterBaseFrom();
            if(second === false) {
                console.log('No second try. Load new pics...');
                loadNewPics(getNextImage); return
            } else {
                setPicture(second); return
            }
        }
    } else {
        setPicture(first); return
    }
};

var onloadPics = () => {};
function loadNewPics(onload = () => {}) {
    onloadPics = onload;
    setTimeout(sendXML, 500)
};

function rateImage(value) {
    // hide buttons
    hideButtons();
    // add tag points & update rating comment
    tagCounter(Number(value));
    updateMinrat(0);
    // delete if bad, point as later if normal
    // hide if Disgusting
    if(Number(value) < -1) {
        maindiv.innerHTML = '';
        window.scroll(0,0)
    };
    if(env.calibrate) {
        // calibrate progress on good pics
        if(Number(value) > 0) {calibrate--};
        if(calibrate <= 0) {
            // end of calibrouka
            env.calibrate = false;
            getNextImage(false)
        } else {
            // random pic for calibrouka =terpim gaycontent=
            var aboba = undefined;
            while(aboba === undefined) {
                aboba = database[Math.floor(Math.random() * (database.length - 0.001))]
            }
            setPicture(aboba)
        }
    } else {
        rateImage = rateImageAfterCalibrate;
        autoRating();
        getNextImage()
    }
};

function rateImageAfterCalibrate(value) {
    // stop preload full
    preloadFull(false);
    // hide buttons
    hideButtons();
    // add tag points & update rating comment
    tagCounter(Number(value));
    updateMinrat(0);
    autoRating();
    // delete if bad, point as later if normal
    if(Number(value) < 0) {
        delete database[progress];
        // hide if Disgusting
        if(Number(value) < -1) {
            maindiv.innerHTML = '';
            window.scroll(0,0)
        }
    } else {
        // saving if good/perfect
        if(value > 0) {
            var save = new Image();
            save.src = mainpic.src;
            env.saved.push(save)
        };
        // set as visible later
        database[progress].later = true
    };
    // get next picture
    progress++;
    getNextImage(false);
    // load new pics, if close to end
    if(database.length - progress < 300) {
        sendXML()
    }
};

var style = {
    width: 0,
    height: 0,
    image: 0,
};

function render() {
    // set width & height
    style.width = window.innerWidth;
    style.height = window.innerHeight;
    // body form
    if(style.width > style.height) {
        style.image = Number(style.height);
        document.body.style.width = String(style.height) + 'px';
        document.body.style.left = String(Math.round(window.innerWidth - window.innerHeight)/2) + 'px'
    } else {
        style.image = Number(style.width);
        document.body.style.width = String(style.width) + 'px';
        document.body.style.left = '0px'
    }
};
setInterval(render, 1000/30);
/*
RESPONSE => {
    "preview_url":"https://api-cdn.rule34.xxx/thumbnails/2666/thumbnail_d1705b0655b5ada63d138662da1292c1.jpg",
    "sample_url":"https://api-cdn.rule34.xxx/images/2666/d1705b0655b5ada63d138662da1292c1.jpeg",
    "file_url":"https://api-cdn.rule34.xxx/images/2666/d1705b0655b5ada63d138662da1292c1.jpeg",
    "directory":2666,
    "hash":"d1705b0655b5ada63d138662da1292c1",
    "width":1024,
    "height":1497,
    "id":10669049,
    "image":"d1705b0655b5ada63d138662da1292c1.jpeg",
    "change":1720958967,
    "owner":"shailsic",
    "parent_id":0,
    "rating":"explicit",
    "sample":false,
    "sample_height":0,
    "sample_width":0,
    "score":4,
    "tags":"1girls ai_generated ass ass_focus clothed clothing curvy decademix deviantart disney disney_channel earrings face_down_ass_up female_only fully_clothed headband huge_ass laying_on_bed linda_flynn-fletcher milf orange_hair phineas_and_ferb short_hair source western_cartoon",
    "source":"https://www.deviantart.com/decademix/art/Linda-Flynn-Fletcher-Phineas-and-Ferb-6-1064195313",
    "status":"active",
    "has_notes":false,
    "comment_count":0
}
*/
