BASE_URL = 'https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1';

var xhr = new XMLHttpRequest();
const domParser = new DOMParser();

var maindiv = null;
var divtok = null;
var divlikes = null;

var mainpic = {};
mainpic.meta = {};
mainpic.meta.type = '???';

var mainplayer = document.createElement('video');
mainplayer.volume = 0;
mainplayer.src = '';
mainplayer.loop = true;
mainplayer.controls = true;
mainplayer.oncanplay = () => {mainplayer.play()};
mainplayer.style = 'width: 100%;';

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
                setCourseDiv(`Full loaded!`);
                mainpic.src = String(preloadpic.src);
                maindiv.innerHTML = '';
                maindiv.appendChild(mainpic);
            }
        } else {
            setCourseDiv(`Full loaded!`);
            mainplayer.src = mainpic.meta.full;
            maindiv.innerHTML = '';
            maindiv.appendChild(mainplayer);
        }
    } else {
        mainplayer.src = '';
        preloadpic.src = '';
        preloadpic.onload = () => {}
    }
};

function setCourseDiv(comment) {
    var div = document.getElementById('course');
    var type = mainpic.meta !== undefined ? mainpic.meta.type : '???';
    // var clr = load > 2 ? '#ccc' : '#f44';
    if(env.calibrate) {
        div.innerHTML = `
        <div class='mainfont' style="padding: 12px; margin-top: 8px;">
            <font color="#ccc" size="4">[${type}] ${comment}</font>
            <br>
            <font color="#aaa" size="4">Calibration! Good/Perfect images left: ${calibrate}</font>
        </div>`
    } else {
        div.innerHTML = `
        <div class='mainfont' style="padding: 12px; margin-top: 8px;">
            <font color="#ccc" size="4">[${type}] ${comment}</font>
            <br>
            <font color="#aaa" size="4" id="picrate">Current picture rating: ${env.lastrank} | Minimal: ${env.good} | Appropriate pics: ${getRatedCount()} / ${database.length-progress}</font>
            <br>
            <font color="#aaa" size="4">Progress: ${progress} | Page: ${env.page}/${env.pagecount} | Views: ${env.views} | Bad skipped: ${env.bads}</font>
        </div>`
    }
};

var env = {
    request: false,
    query: '',
    pagecount: 0,
    //
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

var calibrate = 10;
var database = [];
var progress = 0;
var buttons = {};

var tokhistory = [];
var historyProgress = 0;
var hisloaded = false;

var randompages = false;
var queryOnly = false;

function optionOrder() {
    if(randompages) {
        randompages = false;
        document.getElementById('opt-order').innerHTML = 'from recent posts'
    } else {
        randompages = true;
        document.getElementById('opt-order').innerHTML = 'randomized'
    }
};

function optionQuery() {
    if(queryOnly) {
        queryOnly = false;
        document.getElementById('opt-query').innerHTML = 'for calibration'
    } else {
        queryOnly = true;
        document.getElementById('opt-query').innerHTML = 'for all posts'
    }
};

function calibrationLength() {
    if(calibrate == 10) {
        calibrate = 15;
        document.getElementById('opt-calib').innerHTML = 'medium (15)'
    } else if(calibrate == 15) {
        calibrate = 20;
        document.getElementById('opt-calib').innerHTML = 'long (20)'
    } else {
        calibrate = 10;
        document.getElementById('opt-calib').innerHTML = 'short (10)'
    }
};

function loadButtons() {
    var bwid = Math.floor((style.image * 0.7) / 5);
    var bh = Math.floor(bwid / 2);
    document.getElementById('buttons').innerHTML = `
        <button class='ratebuttons' style="border-color: #ffff44; width: ${bwid}px; height: ${bh}px; color: #ffff44;" onclick="rateImage(2)">Perfect</button>
        <button class='ratebuttons' style="border-color: #44ff44; width: ${bwid}px; height: ${bh}px; color: #44ff44;" onclick="rateImage(1)">Good</button>
        <button class='ratebuttons' style="border-color: #8888ff; width: ${bwid}px; height: ${bh}px; color: #8888ff;" onclick="rateImage(0)">Skip</button>
        <button class='ratebuttons' style="border-color: #ff44ff; width: ${bwid}px; height: ${bh}px; color: #ff44ff;" onclick="rateImage(-1)">Bad</button>
        <button class='ratebuttons' style="border-color: #ff4444; width: ${bwid}px; height: ${bh}px; color: #ff4444;" onclick="rateImage(-2)">Junk</button>
    `
};
function hideButtons() {document.getElementById('buttons').innerHTML = ``};

function showPictureInfo() {
    document.getElementById('other').innerHTML = `
        <hr align="center" width="100%" color="#fff" style="margin: 0px; border-width: 0px; height: 3px;"/>
        <div style="padding: 16px;">
            <font color="#ccc" size="5">Top tags</font><br>
            <font id="goodtags"></font>
        </div>
        <hr align="center" width="100%" color="#fff" style="margin: 0px; border-width: 0px; height: 3px;"/>
        <div style="padding: 16px;">
            <font color="#ccc" size="5">Current picture tags</font><br>
            <font id="pictags"></font>
        </div>
    `
};

function showLastSession() {
    var save = haveLastSession();
    if(save != false) {
        save = JSON.parse(save);
        env.tagpool = save.env.tagpool;
        var toptags = getTopTags();
        env.tagpool = {};
        document.getElementById('other').innerHTML = `
        <hr align="center" width="100%" color="#fff" style="margin: 0px; border-width: 0px; height: 3px;"/>
        <div style="padding: 8px;">
            <font color="#ccc" size="5">Last session - ${save.date}</font><br>
            <font color="#aaa" size="4">Query: ${save.env.query}</font><br>
            <font color="#aaa" size="4">Randomize pages: ${save.randompages} | Only query: ${save.queryOnly} | Calibrated: ${!save.env.calibrate}</font><br>
            <font color="#aaa" size="4">Progress: ${save.progress} | Page: ${save.env.page} | Minimal: ${save.env.good} | Views: ${save.env.views}</font><br>
            <font color="#aaa" size="4">Top tags: </font>
            <font color="#999" size="4">${toptags}</font>
            <br>
            <button class="startbutton load" onclick="loadSession();" style="margin-top: 14px;">Load session</button>
        `
    } else {
        document.getElementById('other').innerHTML = `
            <hr align="center" width="100%" color="#fff" style="margin: 0px; border-width: 0px; height: 3px;"/>
            <div style="padding: 8px;">
            <font color="#ccc" size="5">No last session save.</font><br>
        `
    };
    //
    var his = localStorage.getItem('rtokSaved');
    if(his != null && his != 'null') {
        tokhistory = JSON.parse(his);
        document.getElementById('other').innerHTML += `
            <button class="startbutton load" onclick="openHistory();">Open history</button>
            </div>
        `
    } else {
        document.getElementById('other').innerHTML += `
            <font color="#ccc" size="5">No saved history.</font><br>
            </div>
        `
    }
};
setTimeout(showLastSession, 1000);

function openHistory() {
    var div = document.getElementsByClassName('top')[0];
    div.scroll(0,0);
    divtok = div.innerHTML;
    div.innerHTML = `<font color="#ccc" size="5" style="padding: 20px;">Length: ${tokhistory.length}/1000 | Oldest save: ${tokhistory[tokhistory.length-1][2]} | Scroll down to upload older images</font><br><br>`;

    var scrollfunc = (e) => {
        console.log('try to load his', e);
        if(!hisloaded) {
            var div = document.getElementsByClassName('top')[0];
            
            if(tokhistory[historyProgress][0].type != 'MP4') {
                var pic = document.createElement('img');
                pic.src = tokhistory[historyProgress][0].thumb;
                pic.meta = tokhistory[historyProgress][0];
                pic.style = 'width: 100%';
                pic.onload = () => {
                    pic.src = pic.meta.full;
                    pic.onload = () => {}
                }
            } else {
                var pic = document.createElement('video');
                pic.volume = 0;
                pic.src = tokhistory[historyProgress][0].full;
                pic.loop = true;
                pic.controls = true;
                pic.poster = tokhistory[historyProgress][0].thumb;
                pic.oncanplay = () => {};
                pic.style = 'width: 100%;';
            };

            var val = tokhistory[historyProgress][1] == 1 ? 'Good' : 'Perfect';
            div.innerHTML += `<font color="#ccc" size="5" style="padding: 16px;">${tokhistory[historyProgress][2]} | ${val}</font>`
            div.appendChild(pic);

            if(historyProgress < tokhistory.length-1) {
                historyProgress++
            } else {
                hisloaded = true;
                document.getElementsByClassName('top')[0].removeEventListener('scrollend', div.scrollfunc)
            }
        }
    };
    
    div.scrollfunc = scrollfunc;
    div.addEventListener('scrollend', scrollfunc);

    // load 10 starting images ***
    var len = 10 > tokhistory.length ? tokhistory.length : 10;
    for(let i = 0; i < len; i++) {scrollfunc()};
};

function saveSession() {
    var envs = JSON.parse(JSON.stringify(env));
    delete envs.saved;
    var save = {
        env: envs,
        calibrate: calibrate,
        randompages: randompages,
        queryOnly: queryOnly,
        progress: progress,
        mainpic: mainpic.meta,
        divtok: document.getElementsByClassName('top')[0].innerHTML,
        date: new Date(),
    };
    localStorage.setItem('rtokLastSession', JSON.stringify(save));
};

function haveLastSession() {
    var save = localStorage.getItem('rtokLastSession');
    return save != null ? localStorage.getItem('rtokLastSession') : false
};

function loadSession() {
    //
    var save = JSON.parse(localStorage.getItem('rtokLastSession'));
    console.log('Loading last sesssion...');
    //
    maindiv = document.getElementById('imagebox');
    maindiv.innerHTML = '';
    document.getElementById('initial').innerHTML = '';
    document.getElementById('other').innerHTML = '';
    setCourseDiv(`Loading last session [${save.date}]...`);
    // set values
    progress = save.progress;
    calibrate = save.calibrate;
    queryOnly = save.queryOnly;
    randompages = save.randompages;
    // set environ
    for(var key in save.env) {env[key] = save.env[key]};
    // onload setting top element
    onloadPics = () => {
        // set document
        document.getElementsByClassName('top')[0].innerHTML = save.divtok;
        maindiv = document.getElementById('imagebox');
        maindiv.innerHTML = '';
        mainpic = document.createElement('img');
        setPicture(save.mainpic, false)
    };
    // get database
    progress -= Math.floor(progress / 1000) * 1000;
    // calibrate difference
    if(!save.env.calibrate) {
        rateImage = rateImageAfterCalibrate;
        sendXML(queryOnly, false)
    } else {
        sendXML(true, false)
    }
};

function startTok() {
    console.log('Starting...');
    maindiv = document.getElementById('imagebox');
    maindiv.innerHTML = '';
    mainpic = document.createElement('img');
    //
    env.query = document.getElementById('query').value;
    document.getElementById('initial').innerHTML = '';
    setCourseDiv('Starting...');
    //
    onloadPics = () => {
        lastCalibratePic = undefined;
        while(lastCalibratePic === undefined) {
            lastCalibratePic = database[Math.floor(Math.random() * (database.length - 0.001))]
        }
        showPictureInfo();
        setPicture(lastCalibratePic);
    };
    sendXML(true, false)
};

function picResize(pic) {
    pic.width = style.image
};

function setPicture(picmeta, save=true) {
    preloadFull(false);
    setCourseDiv('Loading next image thumbnail...');

    removeTimeout();
    addTimeout(() => {rateImage(0); console.warn('Skip picture by timeout (8s.)')}, 8000);
    
    mainpic.src = picmeta.thumb;
    mainpic.meta = picmeta;

    document.getElementById('goodtags').innerHTML = getTopTags();
    document.getElementById('pictags').innerHTML = tagsStringify(picmeta.tags);

    mainpic.onload = () => {
        removeTimeout();
        env.views++;
        loadButtons();
        document.getElementsByClassName('top')[0].scroll(0,0);
        maindiv.innerHTML = '';
        setCourseDiv('Loading full...');

        document.getElementById('bg').style.backgroundImage = `url(${mainpic.src})`;

        mainpic.onload = () => {};
        picResize(mainpic);
        maindiv.appendChild(mainpic);
        preloadFull(picmeta.full)
    };
    if(save) {saveSession()}
};

// document.getElementsByClassName('top')[0].offsetHeight + 100 > (document.getElementsByClassName('top')[0].scrollHeight - document.getElementsByClassName('top')[0].scrollTop)

function sendXML(query=false, random=false) {
    var page = random
    ? Math.floor(Math.random() * (env.pagecount - 0.001))
    : env.page;
    !query
    ? xhr.open('GET', `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&limit=1000&pid=${page}`)
    : xhr.open('GET', `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&limit=1000&tags=${env.query}&pid=${page}`);
    xhr.responseType = 'document';
    xhr.onload = () => {
        // detect api abuse block
        if(xhr.response.querySelector('response') != null) {
            if(xhr.response.querySelector('response').getAttribute('success') == 'false') {
                xhr.onerror(xhr.response.querySelector('response').getAttribute('reason'))
            }
        };
        // work with xml
        env.pagecount = Math.floor(Number(xhr.response.querySelector('posts').getAttribute('count')) / 1000);
        env.page = Math.floor(Number(xhr.response.querySelector('posts').getAttribute('offset')) / 1000) - 1; // potomu chto potom `env.page++` budet Taa
        xhr.response.querySelectorAll('post').forEach((e) => {
            var item = {};
            item.full = e.getAttribute('file_url');
            item.thumb = e.getAttribute('preview_url');
            item.tags = e.getAttribute('tags').split(' ');
            item.score = Number(e.getAttribute('score'));

            item.size = {};
            item.size.x = Number(e.getAttribute('width'));
            item.size.y = Number(e.getAttribute('height'));

            item.later = false;
            item.type = item.full.slice(item.full.lastIndexOf('.')+1).toUpperCase();

            database.push(item)
        });
        env.page++; // for unrandomized pages
        onloadPics()
    };
    xhr.onerror = (e) => {
        console.warn('Error with load pics... Try again after 10s.', e);
        setTimeout(() => {sendXML(query, random)}, 10000)
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
    for(var i = progress; i < database.length; i++) {
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
    return rating
};

function tagsStringify(tags) {
    var str = '';
    var count = 0;
    for(var t in tags) {
        if(tags[t] == '' || tags[t] == ' ') {continue};
        if(env.tagpool[tags[t]] !== undefined) {
            count = env.tagpool[tags[t]]
        } else {
            count = 0
        };
        str += `${tags[t]}[${count}], `
    };
    return str.slice(0, str.length-2)
};

function getTopTags() {
    var tags = [], str = '';
    for(var t in env.tagpool) {
        if(t == '' || t == ' ') {continue};
        tags.push([t, env.tagpool[t]])
    };
    tags.sort((a, b) => {return +b[1] - (+a[1])});
    var iter = 20 > tags.length ? tags.length : 20;
    for(var i=0; i<iter; i++) {
        str += `${tags[i][0]}[${tags[i][1]}], `
    };
    return str.slice(0, str.length-2)
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
                    env.lastrank = rating;
                    return p
                }
            }
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
    setTimeout(() => {sendXML(queryOnly, randompages)}, 500)
};

function likeImage(meta, value) {
    env.saved.unshift([meta, value, new Date()]);
    if(env.saved.length > 1000) {
        env.saved.splice(1000)
    }

    var save = localStorage.getItem('rtokSaved');
    if(save != null) {
        save = JSON.parse(save);
        save.unshift([meta, value, new Date()]);
        if(save.length > 1000) {save.splice(1000)};
        localStorage.setItem('rtokSaved', JSON.stringify(save))
    } else {
        save = [];
        save.unshift([meta, value, new Date()]);
        localStorage.setItem('rtokSaved', JSON.stringify(save))
    }
};

var lastCalibratePic = {};
function rateImage(value) {
    // stop preload full & timeout
    removeTimeout();
    preloadFull(false);
    // hide buttons
    hideButtons();
    // add tag points & update rating comment
    tagCounter(Number(value));
    updateMinrat(0);
    // delete if bad, point as later if normal
    // hide if Disgusting
    if(Number(value) < -1) {
        maindiv.innerHTML = '';
        document.getElementById('bg').style.backgroundImage = ``;
        document.getElementsByClassName('top')[0].scroll(0,0);
    };
    // calibrate progress on good pics
    if(Number(value) > 0) {
        likeImage(mainpic.meta, value);
        // set as visible later
        lastCalibratePic.later = true;
        calibrate--
    };
    if(calibrate > 0) {
            // end of calibrouka
            // getNextImage(false)
            // random pic for calibrouka =terpim gaycontent=
            lastCalibratePic = undefined;
            while(lastCalibratePic === undefined) {
                lastCalibratePic = database[Math.floor(Math.random() * (database.length - 0.001))]
            }
            setPicture(lastCalibratePic)
    } else {
        env.calibrate = false;
        progress = 0;
        database = [];
        rateImage = rateImageAfterCalibrate;
        autoRating();
        getNextImage();
        updateMinrat(0)
    }
};

function rateImageAfterCalibrate(value) {
    // stop preload full
    preloadFull(false);
    removeTimeout();
    // hide buttons
    hideButtons();
    // add tag points & update rating comment
    tagCounter(Number(value));
    autoRating();
    // delete if bad, point as later if normal
    if(Number(value) < 0) {
        delete database[progress];
        // hide if Disgusting
        if(Number(value) < -1) {
            maindiv.innerHTML = '';
            document.getElementById('bg').style.backgroundImage = ``;
            document.getElementsByClassName('top')[0].scroll(0,0);
        }
    } else {
        // saving if good/perfect
        if(value > 0) {likeImage(mainpic.meta, value)};
        // set as visible later
        database[progress].later = true
    };
    // get next picture
    progress++;
    getNextImage(false);
    // load new pics, if close to end
    if(database.length - progress < 300) {
        onloadPics = () => {};
        sendXML(queryOnly, randompages)
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
