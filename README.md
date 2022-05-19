Replace `{{username}}` `{{password}}` in `index.js`

Place the images in the same folder as the `index.js` file.

Image naming rule: `month-date-hours.jpg` (hours can only be 8 or 20)

Examples: 

- `5-20-8.jpg` is the image for May 20th morning
- `5-20-20.jpg` is the image for May 20th evening

```bash
git clone https://github.com/estaya/covid-auto-uploader.git
cd covid-auto-uploader
yarn install
# start, just let it run in background
node index.js
```

If you do not want to show the browser window, change `headless: true` to `headless: false` in `index.js`.

It's worth mentioning that you may have to customize `new_path` in `index.js` to avoid script detection.