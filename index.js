const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const process = require('process');
const assert = require('assert');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const fs = require('fs');

const covid_img_dir = process.argv[2] || __dirname;

function getDate(offset) {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000*offset));
}

function getQR(img_path) {
    return new Promise((resolve, reject) => {
        var Jimp = require("jimp");
        var fs = require('fs');
        var QrCode = require('qrcode-reader');
        var buffer = fs.readFileSync(img_path);
        Jimp.read(buffer, function (err, image) {
            if (err) {
                console.error(err);
                reject();
            }
            let qrcode = new QrCode();
            qrcode.callback = function (err, value) {
                if (err) {
                    console.error(err);
                    reject();
                }
                resolve(value.result);
            };
            qrcode.decode(image.bitmap);
        });
    });
}

const username = '{{username}}';
const password = '{{password}}';

async function submit(covid_img) {
    console.log(`Submitting ${covid_img}`);
    const covid_id = await getQR(covid_img);
    console.log(covid_id);

    const browser = await puppeteer.launch({ headless: false, ignoreDefaultArgs: ["--enable-automation"] });
    try {
        const page = await browser.newPage();
        page.setViewport({ width: 1242, height: 2688 });
        await page.goto('http://wj.shanghaitech.edu.cn/user/qlist.aspx?sysid=159110074');

        const getText = async (selector) => {
            const text = await page.$eval(selector, el => el.innerText);
            return text.trim();
        };
        const type = async (selector, text) => {
            await page.focus(selector);
            await page.keyboard.type(text, { delay: Math.random() * 100 + 50 });
            await delay(Math.random() * 500);
        };


        await type('#register-user-name', username);
        await type('#register-user-password', password);
        await page.click("#btnSubmit");
        await page.waitForNavigation();

        const mainform = '#divFolder > div > div > dl:nth-child(1) > a';
        let text = await getText(mainform);
        console.log(text);
        assert(text.startsWith('????????????????????????????????????'));
        await page.click(mainform);
        await delay(Math.random() * 10000 + 2000);

        console.log('start fill form');

        const confirm = '#divquestion2 > ul > li > label';
        text = await getText(confirm);
        assert.equal(text, '??????');
        await page.click(confirm);

        const negative = '#divquestion3 > ul > li:nth-child(1) > label';
        text = await getText(negative);
        assert.equal(text, '??????');
        await page.click(negative);

        const id_input = '#q5';
        await type(id_input, covid_id);

        const upload = '#uploadFrame4';
        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click(upload),
        ]);
        await fileChooser.accept([covid_img]);

        await delay(Math.random() * 10000 + 10000);

        const submit = '#submit_button';
        await page.click(submit);

        await delay(Math.random() * 10000 + 10000);
    } finally {
        await browser.close();
    }
};

(async () => {
    while (true) {
        const date = getDate('+8');
        m = date.getMonth() + 1;
        d = date.getDate();
        h = date.getHours();
        console.log(`${m}/${d} ${h}:${date.getMinutes()}`);

        let imgs = fs.readdirSync(covid_img_dir).filter(f => f.endsWith('.jpg'));
        for (let img of imgs) {
            try {
                const qr = await getQR(covid_img_dir + '/' + img);
                console.log(img, qr);
            } catch (e) {
                console.log(`cannot recognize the QRCode in ${img}`);
            }
        }

        if (h == 9 || h == 20) {
            console.log('wait 2 min');
            await delay(2 * 60 * 1000);

            covid_img = covid_img_dir + `/${m}-${d}-${h}.jpg`;
            console.log('img path', covid_img);

            if (fs.existsSync(covid_img)) {
                console.log('exist');
                let new_path = covid_img_dir + `/photo_${new Date().toISOString().slice(0, 19).replace('T', '_').replaceAll(':', '-')}.jpg`;
                fs.copyFileSync(covid_img, new_path);
                try {
                    await submit(new_path);
                    console.log('submit success');
                } catch (e) {
                    console.log(e);
                    console.log('submit failed');
                    console.log('delay 2 min');
                    await delay(2 * 60 * 1000);
                    try {
                        console.log('try again');
                        await submit(new_path);
                        console.log('submit success');
                    } catch (e) {
                        console.log(e);
                        console.log('submit failed');
                    }
                }
            } else {
                console.log('not exist');
            }

            console.log('delay 1 hour');
            await delay(60 * 60 * 1000);
        } else {
            console.log('wait 20 min');
            await delay(20 * 60 * 1000);
        }
    }
})();