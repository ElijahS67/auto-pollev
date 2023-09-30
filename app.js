import puppeteer from 'puppeteer';

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

const sleep = s => new Promise(r => setTimeout(r, 1000 * s));

const main = (async () => {
	// Launch the browser and open a new blank page
	const browser = await puppeteer.launch({headless: true, defaultViewport: null});
	const page = await browser.newPage();

	async function advanceNextPage() {
		await Promise.all([
			page.waitForNavigation(),
			page.keyboard.press('Enter')
		]);
	}

	async function clickButton(selector) {
		await page.waitForSelector(selector);
		await page.$eval(selector, x => x.click());
	}

	function waitForSelectorWrapper(selector, value = undefined) {

		const getText = () => page.$eval(selector, header => header.textContent);

		return page.waitForSelector(selector, { timeout: 10000 })
			.then(() => value ?? getText()) //return given value upon resolving, or return text found in selector
			.catch(e => {
				throw e; // Re-throw the error if it occurs during waitForSelector
			}
		);
	}

	// await page.goto('');
	
	await clickButton('button[aria-label="Agree"]');
	await clickButton('button[aria-label="Continue"]');

	const qnSet = new Set();

	while (true) {

		try {
			await sleep(1 * 5);

			const qnPromise = waitForSelectorWrapper('[class="component-response-header__title"]');
			const notStartedYetPromise = waitForSelectorWrapper('h1[class="pec-response-hold__header"]', false);

			const qnTitle = await Promise.race([qnPromise, notStartedYetPromise]);

			if (!qnTitle) {
				// console.log("Poll has not started yet");
				await sleep(1 * 60); //sleep for 2 mins
				continue;
			}

			console.log(qnTitle);

			if (qnSet.has(qnTitle)) {
				console.log("Encountered this qn before, sleeping for 2 mins");
				await sleep(1 * 60); //sleep for 2 mins
				continue;
			}

			const mcqPromise = waitForSelectorWrapper('button[aria-label*="with 0 of your votes, option 1"]', "mcq");
			const openEndedPromise = waitForSelectorWrapper('textarea[name="response"]', "open_ended");

			const value = await Promise.race([mcqPromise, openEndedPromise]);
			
			if (value === "mcq") {
				await page.$eval('button[aria-label*="with 0 of your votes, option 1"]', x => x.click());
				console.log("clicked 1st option");

			} else if (value === "open_ended") {
				//https://stackoverflow.com/questions/46442253/pressing-enter-button-in-puppeteer
				
				await page.focus('textarea[name="response"]');
				await page.keyboard.type('this');
				await page.keyboard.press('Enter');
				console.log("entered text");
			}

			qnSet.add(qnTitle);
			console.log("number of questions done: " + qnSet.size);

		} catch (e) {
			console.error(e)
			continue;
		}

	}

});


main();