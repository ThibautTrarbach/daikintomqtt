import cron from "node-cron";
import {sendDevice} from "./daikin";

async function loadCron() {
	cron.schedule('0 */15 * * * *', async function () {
		logger.debug("Run Polling Daikin")
		await sendDevice()
	});
}

export {
	loadCron
}
