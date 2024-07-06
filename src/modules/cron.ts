import cron from "node-cron";
import {sendDevice, timeUpdate} from "./daikin";

async function loadCron() {
	cron.schedule('0 */15 * * * *', async function () {
		logger.debug("Run Polling Daikin")
		await sendDevice(null, true)
	});

	cron.schedule('*/30 * * * * *', async function () {
		logger.debug("Run refresh after command")
		await timeUpdate()
	});
}

export {
	loadCron
}
