import cron from "node-cron";
import {sendDevice} from "./daikin";

async function loadCron() {
	cron.schedule('*/5 * * * * *', async function () {
		logger.debug("Run Polling Daikin")
		await sendDevice()
	});
}

export {
	loadCron
}
