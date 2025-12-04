import cron from "node-cron";
import {sendDevice, timeUpdate} from "./daikin";

async function loadCron() {
	cron.schedule('0 */15 * * * *', async function () {
		logger.debug("[cron.ts] => CRON - Daikin Polling = RUN")
		await sendDevice(null, true)
		logger.debug("[cron.ts] => CRON - Daikin Polling = FINISH")
	});

	cron.schedule('*/30 * * * * *', async function () {
		logger.debug("[cron.ts] => CRON - Refresh data after action = RUN")
		await timeUpdate()
		logger.debug("[cron.ts] => CRON - Refresh data after action = FINISH")
	});
}

export {
	loadCron
}
