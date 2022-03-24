const { TwitterClient } = require('twitter-api-client');
const { TWITTER_API_KEY, TWITTER_API_SECRET_KEY, TWITTER_API_ACCESS_TOKEN, TWITTER_API_ACCESS_SECRET } = require('./creds.json');
const fs = require('fs');
const cron = require('node-cron');

console.log(`
    ************************************\n
    * MsVoxxie's Twitter Banner Updater*\n
    * --------------Loaded-------------*\n
    ************************************`);

const twitterClient = new TwitterClient({
	apiKey: TWITTER_API_KEY,
	apiSecret: TWITTER_API_SECRET_KEY,
	accessToken: TWITTER_API_ACCESS_TOKEN,
	accessTokenSecret: TWITTER_API_ACCESS_SECRET,
});

const axios = require('axios');
const sharp = require('sharp');

const numFollowers = 5;
const whFollowers = 90;

async function saveAvatar(user, path) {
	const tempURL = await user.profile_image_url_https; //.slice(0, -11);
	// const fullURL = `${tempURL}.jpg`;

	const response = await axios({
		// url: fullURL,
		url: tempURL,
		responseType: 'arraybuffer',
	});
	await sharp(response.data).resize(whFollowers, whFollowers).toFile(path);
}

async function getLatestFollowerImages() {
	console.log('Getting Followers');

	try {
		const data = await twitterClient.accountsAndUsers.followersList({
			screen_name: 'MsVoxxie',
			count: numFollowers,
		});

		await Promise.all(data.users.map((user, index) => saveAvatar(user, `./img/avatars/${index}.png`)));
	} catch (error) {
		console.error(error);
	}
}

const Jimp = require('jimp');

async function createBanner() {
	const banner = await Jimp.read(`${__dirname}/img/i/Template.png`);
	const mask = await Jimp.read(`${__dirname}/img/i/mask.png`);
	await mask.resize(whFollowers, whFollowers);

	//Banner Build
	console.log(`Appending images`);
	await Promise.all(
		[...Array(numFollowers)].map((_, i) => {
			return new Promise(async (resolve) => {
				const image = await Jimp.read(`./img/avatars/${i}.png`);
				const masked = await image.mask(mask, 0, 0);
				const x = 435 + i * (whFollowers + 45);
				banner.composite(masked, x, 380);
				resolve();
			});
		})
	);
	console.log('Saving Banner');
	await banner.writeAsync(`./img/banner/1500x500_final.png`);
}

async function uploadBanner() {
	console.log('Uploading Banner');
	const base64 = await fs.readFileSync('./img/banner/1500x500_final.png', { encoding: 'base64' });
	await twitterClient.accountsAndUsers.accountUpdateProfileBanner({ banner: base64 });
}

async function Start() {
	await getLatestFollowerImages();
	await createBanner();
	await uploadBanner();

	const moment = require('moment');
	console.log(`Ran At› ${moment().format('MMMM Do YYYY, h:mm:ss a')}`);
}

// Start();

cron.schedule('*/5 * * * *', function () {
	Start();
});
